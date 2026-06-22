// app/api/lounges/[id]/join-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Lounge } from "@/models/lounge";
import { LoungeJoinRequest } from "@/models/lounge-join-request";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/create-notification";
import { connectDB } from "@/lib/connect-to-database";

export const dynamic = "force-dynamic";

/**
 * POST /api/lounges/[id]/join-request
 * -----------------------------------
 * The user asks to join a members-only (creator) lounge. Creates a pending
 * LoungeJoinRequest that the lounge's creator must approve or decline.
 *
 * Guards:
 *   - must be authenticated
 *   - lounge must exist, be active, and be a creator lounge (open lounges don't
 *     use requests — you just enter them)
 *   - can't request your own lounge
 *   - can't double-request (a pending one already exists)
 *   - respects the decline cooldown (canResendAfter)
 *
 * Notifies the creator so it surfaces in their activity panel.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid lounge" }, { status: 400 });
    }

    await connectDB();

    const lounge = await Lounge.findById(id).lean<{ _id: any; kind: string; status: string; creatorId?: any; name: string }>();
    if (!lounge || lounge.status !== "active") {
      return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
    }

    // Only creator lounges use the request flow.
    if (lounge.kind !== "creator" || !lounge.creatorId) {
      return NextResponse.json({ error: "This lounge doesn't require a request", code: "NOT_REQUESTABLE" }, { status: 400 });
    }

    // Can't request your own lounge.
    if (String(lounge.creatorId) === String(user.id)) {
      return NextResponse.json({ error: "You own this lounge", code: "OWN_LOUNGE" }, { status: 400 });
    }

    // Existing request? Decide based on its status.
    const existing = await LoungeJoinRequest.findOne({ loungeId: id, requesterId: user.id })
      .sort({ createdAt: -1 });

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ status: "pending", message: "Request already pending" });
      }
      if (existing.status === "approved") {
        return NextResponse.json({ status: "approved", message: "You're already a member" });
      }
      if (existing.status === "declined" && existing.canResendAfter && existing.canResendAfter > new Date()) {
        return NextResponse.json(
          { error: "You can request again later", code: "COOLDOWN", canResendAfter: existing.canResendAfter },
          { status: 429 }
        );
      }
      // Declined past cooldown, or cancelled → reopen this record as pending.
      existing.status = "pending";
      existing.message = (await safeMessage(req)) ?? existing.message;
      existing.respondedAt = undefined;
      existing.canResendAfter = undefined;
      await existing.save();

      await createNotification({
        recipientId: String(lounge.creatorId),
        type: "lounge_join_request",
        actorId: String(user.id),
        message: `requested to join ${lounge.name}`,
        entityType: "lounge_message",
        entityId: String(lounge._id),
      });

      return NextResponse.json({ status: "pending" });
    }

    // Fresh request.
    await LoungeJoinRequest.create({
      loungeId: lounge._id,
      requesterId: user.id,
      creatorId: lounge.creatorId,
      status: "pending",
      message: await safeMessage(req),
    });

    await createNotification({
      recipientId: String(lounge.creatorId),
      type: "lounge_join_request",
      actorId: String(user.id),
      message: `requested to join ${lounge.name}`,
      entityType: "lounge_message",
      entityId: String(lounge._id),
    });

    return NextResponse.json({ status: "pending" });
  } catch (error: any) {
    // Duplicate-key (race on the partial-unique index) → treat as already pending.
    if (error?.code === 11000) {
      return NextResponse.json({ status: "pending" });
    }
    console.error("[POST /api/lounges/[id]/join-request]", error);
    return NextResponse.json({ error: "Couldn't send request" }, { status: 500 });
  }
}

async function safeMessage(req: NextRequest): Promise<string | undefined> {
  try {
    const body = await req.json();
    const m = typeof body?.message === "string" ? body.message.trim() : "";
    return m ? m.slice(0, 300) : undefined;
  } catch {
    return undefined;
  }
}
// app/api/lounges/[id]/join-requests/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Lounge } from "@/models/lounge";
import { LoungeJoinRequest } from "@/models/lounge-join-request";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/create-notification";

export const dynamic = "force-dynamic";

/**
 * GET /api/lounges/[id]/join-requests
 * ------------------------------------
 * Returns all pending join requests for a lounge the current user owns.
 * Only the lounge creator can access this.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid lounge" }, { status: 400 });
    }

    await connectDB();

    const lounge = await Lounge.findById(id).lean<{ _id: any; creatorId: any; name: string }>();
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
    if (String(lounge.creatorId) !== String(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await LoungeJoinRequest.find({ loungeId: id, status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    // Batch-fetch requester profiles
    const requesterIds = requests.map((r: any) => r.requesterId);
    const db = mongoose.connection.db!;
    const profiles = requesterIds.length
      ? await db.collection("profiles")
          .find(
            { userId: { $in: requesterIds.map((id: any) => new mongoose.Types.ObjectId(String(id))) } },
            { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1, bio: 1 } }
          )
          .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const items = requests.map((r: any) => {
      const p = profileMap.get(String(r.requesterId));
      return {
        id:        String(r._id),
        loungeId:  String(r.loungeId),
        loungeName: String(lounge.name),
        message:   r.message ?? null,
        createdAt: r.createdAt,
        requester: {
          id:       String(r.requesterId),
          name:     String(p?.displayName || p?.username || "Nomeo user"),
          username: String(p?.username || ""),
          avatar:   String(p?.profileImage?.url || ""),
          bio:      String(p?.bio || ""),
        },
      };
    });

    return NextResponse.json({ requests: items });
  } catch (err) {
    console.error("[GET /api/lounges/[id]/join-requests]", err);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

/**
 * PATCH /api/lounges/[id]/join-requests/[requestId]
 * ---------------------------------------------------
 * Creator approves or declines a join request.
 * Body: { action: "approve" | "decline", cooldownDays?: number }
 *
 * On approve  → request status → "approved"; notify requester.
 * On decline  → request status → "declined"; set canResendAfter; notify requester.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id, requestId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(requestId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { action, cooldownDays = 7 } = await req.json();
    if (action !== "approve" && action !== "decline") {
      return NextResponse.json({ error: "action must be 'approve' or 'decline'" }, { status: 400 });
    }

    await connectDB();

    const lounge = await Lounge.findById(id).lean<{ _id: any; creatorId: any; name: string }>();
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
    if (String(lounge.creatorId) !== String(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const joinReq = await LoungeJoinRequest.findOne({ _id: requestId, loungeId: id });
    if (!joinReq) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (joinReq.status !== "pending") {
      return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });
    }

    if (action === "approve") {
      joinReq.status      = "approved";
      joinReq.respondedAt = new Date();
      await joinReq.save();

      // Notify the requester
      await createNotification({
        recipientId: String(joinReq.requesterId),
        type:        "lounge_join_accepted",
        actorId:     String(user.id),
        message:     `approved your request to join ${lounge.name}`,
        entityType:  "lounge_message",
        entityId:    String(lounge._id),
      });
    } else {
      joinReq.status         = "declined";
      joinReq.respondedAt    = new Date();
      joinReq.canResendAfter = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000);
      await joinReq.save();

      await createNotification({
        recipientId: String(joinReq.requesterId),
        type:        "lounge_join_declined",
        actorId:     String(user.id),
        message:     `declined your request to join ${lounge.name}`,
        entityType:  "lounge_message",
        entityId:    String(lounge._id),
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (err) {
    console.error("[PATCH /api/lounges/[id]/join-requests/[requestId]]", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
// app/api/connections/requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { ConnectionRequest } from "@/models/connection-request";
import { Following } from "@/models/following";
import { bumpUserActivity } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/connections/requests/[id]  { action: "accept" | "decline" }
 * ------------------------------------------------------------------------
 * The recipient accepts or declines a pending request.
 *
 * On ACCEPT:
 *   Reader  → Creator : unilateral  — requester follows recipient only
 *                        requester +followingCount, recipient +followersCount
 *
 *   Creator → Creator : bilateral   — both follow each other
 *                        both get +followingCount AND +followersCount
 *
 * On DECLINE: status set to "declined" with a 14-day resend cooldown.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }  = await params;
    const user    = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    if (action !== "accept" && action !== "decline")
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    await connectDB();

    const reqDoc = await ConnectionRequest.findById(id);
    if (!reqDoc)
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (String(reqDoc.recipientId) !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (reqDoc.status !== "pending")
      return NextResponse.json({ error: "Already handled" }, { status: 409 });

    const now = new Date();

    if (action === "accept") {
      reqDoc.status      = "accepted";
      reqDoc.respondedAt = now;
      await reqDoc.save();

      const db = mongoose.connection.db!;

      // ── Determine if both parties are creators (bilateral follow) ────
      const [requesterUser, recipientUser] = await Promise.all([
        db.collection("users").findOne(
          { _id: reqDoc.requesterId },
          { projection: { role: 1 } }
        ),
        db.collection("users").findOne(
          { _id: reqDoc.recipientId },
          { projection: { role: 1 } }
        ),
      ]);

      const requesterIsCreator = requesterUser?.role === "creator";
      const recipientIsCreator = recipientUser?.role === "creator";
      const isBilateral        = requesterIsCreator && recipientIsCreator;

      // ── Create Following edges ───────────────────────────────────────
      if (isBilateral) {
        // Creator ↔ Creator: mutual follow — both directions
        await Promise.all([
          Following.updateOne(
            { followerId: reqDoc.requesterId, followingId: reqDoc.recipientId },
            { $set: { isActive: true }, $setOnInsert: { followerId: reqDoc.requesterId, followingId: reqDoc.recipientId } },
            { upsert: true }
          ),
          Following.updateOne(
            { followerId: reqDoc.recipientId, followingId: reqDoc.requesterId },
            { $set: { isActive: true }, $setOnInsert: { followerId: reqDoc.recipientId, followingId: reqDoc.requesterId } },
            { upsert: true }
          ),
        ]);
      } else {
        // Reader → Creator (or any unilateral): requester follows recipient only
        await Following.updateOne(
          { followerId: reqDoc.requesterId, followingId: reqDoc.recipientId },
          { $set: { isActive: true }, $setOnInsert: { followerId: reqDoc.requesterId, followingId: reqDoc.recipientId } },
          { upsert: true }
        );
      }

      // ── Increment profile counts ─────────────────────────────────────
      if (isBilateral) {
        // Both gain +1 followersCount and +1 followingCount
        await Promise.all([
          db.collection("profiles").updateOne(
            { userId: reqDoc.requesterId },
            { $inc: { followersCount: 1, followingCount: 1 } }
          ),
          db.collection("profiles").updateOne(
            { userId: reqDoc.recipientId },
            { $inc: { followersCount: 1, followingCount: 1 } }
          ),
        ]);
      } else {
        // Requester +followingCount, Recipient +followersCount
        await Promise.all([
          db.collection("profiles").updateOne(
            { userId: reqDoc.requesterId },
            { $inc: { followingCount: 1 } }
          ),
          db.collection("profiles").updateOne(
            { userId: reqDoc.recipientId },
            { $inc: { followersCount: 1 } }
          ),
        ]);
      }

      // ── Real-time: notify requester they were accepted ───────────────
      bumpUserActivity(String(reqDoc.requesterId), "connection").catch(() => {});

    } else {
      // Decline
      reqDoc.status        = "declined";
      reqDoc.respondedAt   = now;
      reqDoc.canResendAfter = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
      await reqDoc.save();
    }

    return NextResponse.json({ success: true, status: reqDoc.status });
  } catch (err) {
    console.error("[PATCH /api/connections/requests/[id]]", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
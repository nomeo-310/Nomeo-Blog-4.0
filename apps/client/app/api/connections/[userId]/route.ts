// app/api/connections/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { ConnectionRequest } from "@/models/connection-request";
import { Following } from "@/models/following";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/connections/[userId]
 * ---------------------------------
 * Handles two cases based on current relationship state:
 *
 *   UNFOLLOW  — connection request is still "pending" (I sent it, want to cancel)
 *               → sets status "cancelled", no count change needed (never accepted)
 *
 *   DISCONNECT — connection is "accepted" (we are connected, want to remove)
 *               → sets status "cancelled", deactivates Following edge,
 *                 decrements followingCount on my profile
 *                 decrements followersCount on their profile
 *
 * [userId] is the OTHER person's userId (the one being unfollowed/disconnected).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (otherId === user.id)
      return NextResponse.json({ error: "Cannot disconnect from yourself" }, { status: 400 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const myId    = new mongoose.Types.ObjectId(user.id);
    const theirId = new mongoose.Types.ObjectId(otherId);

    // Find the connection request in either direction
    const conn = await ConnectionRequest.findOne({
      $or: [
        { requesterId: myId,    recipientId: theirId },
        { requesterId: theirId, recipientId: myId    },
      ],
      status: { $in: ["pending", "accepted"] },
    });

    if (!conn)
      return NextResponse.json({ error: "No active connection found" }, { status: 404 });

    const wasAccepted = conn.status === "accepted";
    const iWasSender  = String(conn.requesterId) === user.id;

    // ── Cancel / disconnect ────────────────────────────────────────────
    // Only the requester can cancel a pending request.
    // Either party can disconnect an accepted connection.
    if (conn.status === "pending" && !iWasSender) {
      return NextResponse.json(
        { error: "Only the sender can cancel a pending request" },
        { status: 403 }
      );
    }

    conn.status = "cancelled";
    await conn.save();

    if (wasAccepted) {
      // Deactivate the Following edge
      // followerId = requester (who was following the recipient)
      await Following.updateOne(
        { followerId: conn.requesterId, followingId: conn.recipientId },
        { $set: { isActive: false } }
      );

      // Decrement profile counts:
      //   requester loses -1 followingCount
      //   recipient loses -1 followersCount
      await Promise.all([
        db.collection("profiles").updateOne(
          { userId: conn.requesterId },
          { $inc: { followingCount: -1 } }
        ),
        db.collection("profiles").updateOne(
          { userId: conn.recipientId },
          { $inc: { followersCount: -1 } }
        ),
      ]);
    }

    return NextResponse.json({
      success: true,
      action: wasAccepted ? "disconnected" : "cancelled",
    });
  } catch (err) {
    console.error("[DELETE /api/connections/[userId]]", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
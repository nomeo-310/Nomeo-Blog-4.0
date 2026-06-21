// app/api/connections/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { ConnectionRequest } from "@/models/connection-request";
import { bumpUserActivity } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/connections?tab=following|followers
 * ---------------------------------------------
 * Returns the viewer's social graph.
 *   following → people the viewer follows  (followerId = me)
 *   followers → people who follow the viewer (followingId = me)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ connections: [], total: 0 });

    const uid = new mongoose.Types.ObjectId(user.id);
    const tab = new URL(req.url).searchParams.get("tab") ?? "following";

    const filter = tab === "followers"
      ? { followingId: uid, isActive: true }
      : { followerId:  uid, isActive: true };

    const followings = await db.collection("followings")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .project({ followerId: 1, followingId: 1 })
      .toArray();

    if (!followings.length) return NextResponse.json({ connections: [], total: 0 });

    const otherIds = followings.map((f: any) =>
      tab === "followers" ? f.followerId : f.followingId
    );

    const [profiles, userDocs] = await Promise.all([
      db.collection("profiles")
        .find({ userId: { $in: otherIds } })
        .project({ userId: 1, displayName: 1, username: 1, profileImage: 1, bio: 1 })
        .toArray(),
      db.collection("users")
        .find({ _id: { $in: otherIds } })
        .project({ _id: 1, role: 1 })
        .toArray(),
    ]);

    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));
    const roleMap    = new Map(userDocs.map((u: any)  => [String(u._id),   u.role]));

    const connections = otherIds
      .map((id: mongoose.Types.ObjectId) => {
        const sid = String(id);
        const p   = profileMap.get(sid);
        if (!p) return null;
        return {
          id:        sid,
          name:      String(p.displayName || p.username || "Nomeo user"),
          username:  String(p.username || ""),
          avatar:    String(p.profileImage?.url || ""),
          bio:       String(p.bio || ""),
          isCreator: roleMap.get(sid) === "creator",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ connections, total: connections.length });
  } catch (err) {
    console.error("[GET /api/connections]", err);
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }
}

/**
 * POST /api/connections { recipientId }
 * --------------------------------------
 * Sends a connection request. Idempotent — refuses if one already
 * exists (pending/accepted) between the pair.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipientId } = await req.json();
    if (!recipientId || recipientId === user.id)
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });

    await connectDB();

    const existing = await ConnectionRequest.findOne({
      $or: [
        { requesterId: user.id, recipientId },
        { requesterId: recipientId, recipientId: user.id },
      ],
      status: { $in: ["pending", "accepted"] },
    }).lean();

    if (existing)
      return NextResponse.json({ error: "A connection or request already exists." }, { status: 409 });

    await ConnectionRequest.create({
      requesterId: new mongoose.Types.ObjectId(user.id),
      recipientId: new mongoose.Types.ObjectId(recipientId),
      status:      "pending",
    });

    // Real-time: tell the recipient their activity changed (live bell).
    bumpUserActivity(recipientId, "connection").catch(() => {});

    return NextResponse.json({ success: true, status: "request_sent" }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/connections]", err);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
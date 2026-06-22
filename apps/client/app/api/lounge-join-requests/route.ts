// app/api/lounge-join-requests/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/lounge-join-requests
 * ------------------------------
 * Creator inbox — returns ALL pending join requests across every lounge
 * the authenticated user owns, in one call.
 *
 * Steps:
 *   1. Find all active lounges where creatorId = current user
 *   2. Find all pending join requests for those lounge IDs
 *   3. Batch-fetch requester profiles
 *   4. Return unified list with loungeName attached to each request
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db!;
    const uid = new mongoose.Types.ObjectId(user.id);

    // 1. Get all lounges this creator owns
    const lounges = await db.collection("lounges")
      .find({ creatorId: uid, status: "active" }, { projection: { _id: 1, name: 1 } })
      .toArray();

    if (!lounges.length) return NextResponse.json({ requests: [] });

    const loungeIds  = lounges.map((l: any) => l._id);
    const loungeMap  = new Map(lounges.map((l: any) => [String(l._id), String(l.name)]));

    // 2. Pending join requests for any of those lounges
    const raw = await db.collection("lounge_join_requests")
      .find({ loungeId: { $in: loungeIds }, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    if (!raw.length) return NextResponse.json({ requests: [] });

    // 3. Batch-fetch requester profiles
    const requesterIds = [...new Set(raw.map((r: any) => String(r.requesterId)))];
    const profiles = await db.collection("profiles")
      .find(
        { userId: { $in: requesterIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1, bio: 1 } }
      )
      .toArray();
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    // 4. Shape response
    const requests = raw.map((r: any) => {
      const p = profileMap.get(String(r.requesterId));
      return {
        id:         String(r._id),
        loungeId:   String(r.loungeId),
        loungeName: loungeMap.get(String(r.loungeId)) ?? "Lounge",
        message:    r.message ?? null,
        createdAt:  r.createdAt,
        requester: {
          id:       String(r.requesterId),
          name:     String(p?.displayName || p?.username || "Nomeo user"),
          username: String(p?.username || ""),
          avatar:   String(p?.profileImage?.url || ""),
          bio:      String(p?.bio || ""),
        },
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[GET /api/lounge-join-requests]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
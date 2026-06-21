// app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/search?q=&creatorsOnly=true
 * -------------------------------------------
 * Searches among people the authenticated user follows (accepted followings)
 * who are also creators. Used for co-author invites on the post editor.
 *
 * Only people you follow can be invited as co-authors — this keeps the
 * invite system within trusted connections (matches the schema note:
 * "Must have an accepted ConnectionRequest with the author").
 *
 * Returns up to 10 results matching the query against displayName / username.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ users: [] });

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return NextResponse.json({ users: [] });

    const uid = new mongoose.Types.ObjectId(user.id);

    // People I follow who are still active
    const followings = await db.collection("followings")
      .find({ followerId: uid, isActive: true })
      .project({ followingId: 1 })
      .toArray();

    const followingIds = followings.map((f: any) => f.followingId);
    if (!followingIds.length) return NextResponse.json({ users: [] });


    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // Search profiles of people I follow
    const profiles = await db.collection("profiles")
      .find({
        userId: { $in: followingIds },
        $or: [{ displayName: rx }, { username: rx }],
      })
      .project({ userId: 1, displayName: 1, username: 1, profileImage: 1 })
      .limit(10)
      .toArray();

    if (!profiles.length) return NextResponse.json({ users: [] });

    // Filter to creators only
    const profileUserIds = profiles.map((p: any) => p.userId);
    const creatorUsers = await db.collection("user")
      .find({ _id: { $in: profileUserIds }, role: "creator" })
      .project({ _id: 1 })
      .toArray();

    const creatorIdSet = new Set(creatorUsers.map((u: any) => String(u._id)));

    const users = profiles
      .filter((p: any) => creatorIdSet.has(String(p.userId)))
      .map((p: any) => ({
        id:       String(p.userId),
        name:     String(p.displayName || p.username || "Creator"),
        username: String(p.username || ""),
        avatar:   String(p.profileImage?.url || ""),
      }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[GET /api/users/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
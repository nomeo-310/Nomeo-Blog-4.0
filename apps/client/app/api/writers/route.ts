// app/api/writers/route.ts
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/connect-to-database";
import mongoose         from "mongoose";

export const dynamic    = "force-dynamic";
export const revalidate = 3600; // re-fetch at most once per hour

/**
 * GET /api/writers
 * ----------------
 * Returns up to 24 active creators for the About page writer grid.
 * Sorted by follower count descending so the most established writers
 * appear first.
 */
export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const writers = await db
      .collection("profiles")
      .aggregate([
        // Only verified creators with a public profile
        {
          $match: {
            role:     "creator",
            isBanned: { $ne: true },
            username: { $exists: true, $ne: "" },
          },
        },
        // Join Better Auth user to get name + avatar
        {
          $lookup: {
            from:         "user",
            localField:   "userId",
            foreignField: "_id",
            as:           "user",
          },
        },
        { $unwind: "$user" },
        // Only include active accounts
        { $match: { "user.role": "creator" } },
        // Sort by followers descending
        { $sort: { followersCount: -1 } },
        { $limit: 24 },
        {
          $project: {
            _id:            0,
            username:       1,
            displayName:    1,
            bio:            1,
            avatar:         1,
            followersCount: 1,
          },
        },
      ])
      .toArray();

    return NextResponse.json({ writers });
  } catch {
    return NextResponse.json({ writers: [] });
  }
}
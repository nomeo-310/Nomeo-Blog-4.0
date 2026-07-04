// app/api/writers/route.ts
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/connect-to-database";
import mongoose         from "mongoose";

export const dynamic    = "force-dynamic";
export const revalidate = 3600;

/**
 * GET /api/writers
 * ----------------
 * Returns up to 24 active creators for the About page writer grid.
 * Sorted by follower count descending.
 *
 * Creator = User.role === "creator" AND Profile.creatorStatus === "active"
 *           AND Profile.banStatus === "active"
 */
export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const writers = await db
      .collection("profiles")
      .aggregate([
        // Only active creators with no ban
        {
          $match: {
            creatorStatus: "active",
            banStatus:     "active",
            username:      { $exists: true, $ne: "" },
            onboardingCompleted: true,
          },
        },
        // Join Better Auth user to confirm role and get name
        {
          $lookup: {
            from:         "user",
            localField:   "userId",
            foreignField: "_id",
            as:           "user",
          },
        },
        { $unwind: "$user" },
        // Confirm the user record also says creator
        { $match: { "user.role": "creator" } },
        // Most followed first
        { $sort: { followersCount: -1 } },
        { $limit: 24 },
        {
          $project: {
            _id:            0,
            username:       1,
            displayName:    1,
            bio:            1,
            followersCount: 1,
            // profileImage is { url, publicId } — we only need the url
            avatar: "$profileImage.url",
          },
        },
      ])
      .toArray();

    return NextResponse.json({ writers });
  } catch {
    return NextResponse.json({ writers: [] });
  }
}
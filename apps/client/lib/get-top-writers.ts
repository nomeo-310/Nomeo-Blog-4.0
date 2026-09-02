import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";

/**
 * Shared source of truth for "top writers" listings — used by both
 * GET /api/writers (the About page's teaser grid, react-query) and
 * app-pages/writers/writers-page.tsx (the full directory, server-rendered).
 * One aggregation, one place to change the ranking/shape.
 */

export interface TopWriterPost {
  id: string;
  slug: string;
  title: string;
  readingTime: number | null;
  publishedAt: string | null;
}

export interface TopWriter {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  followersCount: number;
  paidPosts: TopWriterPost[];
  freePosts: TopWriterPost[];
  paidPostsCount: number;
  freePostsCount: number;
}

/**
 * Top `limit` active creators by follower count, each with up to
 * `postsPerCategory` of their most recent published posts in each of
 * "paid" and "free" (Post.access), plus the true count in each category
 * so the UI can offer "view all" when there's more than shown.
 */
export async function getTopWriters(limit = 24, postsPerCategory = 4): Promise<TopWriter[]> {
  await connectDB();
  const db = mongoose.connection.db!;

  const postProjection = {
    _id: 1,
    slug: 1,
    title: 1,
    readingTime: 1,
    publishedAt: 1,
  };

  const writers = await db
    .collection("profiles")
    .aggregate([
      {
        $match: {
          creatorStatus: "active",
          banStatus: "active",
          username: { $exists: true, $ne: "" },
          onboardingCompleted: true,
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.role": "creator" } },
      { $sort: { followersCount: -1 } },
      { $limit: limit },
      {
        // One published-posts lookup, split into paid/free via $facet so
        // each category gets its own top-N and total count in one pass.
        $lookup: {
          from: "posts",
          let: { authorId: "$userId" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$authorId", "$$authorId"] }, { $eq: ["$status", "published"] }, { $eq: ["$isRemoved", false] }] } } },
            { $sort: { publishedAt: -1 } },
            {
              $facet: {
                paid: [{ $match: { access: "paid" } }, { $limit: postsPerCategory }, { $project: postProjection }],
                free: [{ $match: { access: "free" } }, { $limit: postsPerCategory }, { $project: postProjection }],
                paidCount: [{ $match: { access: "paid" } }, { $count: "n" }],
                freeCount: [{ $match: { access: "free" } }, { $count: "n" }],
              },
            },
          ],
          as: "postsFacet",
        },
      },
      {
        $project: {
          _id: 0,
          username: 1,
          displayName: 1,
          bio: 1,
          followersCount: 1,
          avatar: "$profileImage.url",
          postsFacet: { $arrayElemAt: ["$postsFacet", 0] },
        },
      },
    ])
    .toArray();

  return writers.map((w) => {
    const facet = w.postsFacet ?? { paid: [], free: [], paidCount: [], freeCount: [] };
    const toPost = (p: { _id: mongoose.Types.ObjectId; slug: string; title: string; readingTime?: number; publishedAt?: Date }): TopWriterPost => ({
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      readingTime: p.readingTime ?? null,
      publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    });
    return {
      username: String(w.username || ""),
      displayName: String(w.displayName || ""),
      bio: String(w.bio || ""),
      avatar: String(w.avatar || ""),
      followersCount: Number(w.followersCount || 0),
      paidPosts: (facet.paid ?? []).map(toPost),
      freePosts: (facet.free ?? []).map(toPost),
      paidPostsCount: facet.paidCount?.[0]?.n ?? 0,
      freePostsCount: facet.freeCount?.[0]?.n ?? 0,
    };
  });
}

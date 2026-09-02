import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Profile } from "@/models/profile";
import { Post } from "@/models/post";

export interface WriterPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: number | null;
  publishedAt: string | null;
}

export interface WriterPosts {
  paidPosts: WriterPostDetail[];
  freePosts: WriterPostDetail[];
}

const postProjection = {
  slug: 1, title: 1, excerpt: 1, coverImage: 1, readingTime: 1, publishedAt: 1,
} as const;

function toDetail(p: {
  _id: mongoose.Types.ObjectId; slug: string; title: string; excerpt?: string;
  coverImage?: { secureUrl?: string }; readingTime?: number; publishedAt?: Date;
}): WriterPostDetail {
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || "",
    coverImage: p.coverImage?.secureUrl || null,
    readingTime: p.readingTime ?? null,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
  };
}

/**
 * A single writer's full paid and free post lists — the "view details" modal
 * on /writers fetches this on demand rather than every writer on the grid
 * carrying its full post history up front (getTopWriters only keeps a
 * handful per category for the card preview).
 */
export async function getWriterPosts(username: string, limit = 50): Promise<WriterPosts | null> {
  await connectDB();

  const profile = await Profile.findOne(
    { username: username.toLowerCase(), creatorStatus: "active", banStatus: "active" },
    { userId: 1 }
  ).lean();
  if (!profile) return null;

  const [paid, free] = await Promise.all([
    Post.find({ authorId: profile.userId, status: "published", isRemoved: false, access: "paid" }, postProjection)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(),
    Post.find({ authorId: profile.userId, status: "published", isRemoved: false, access: "free" }, postProjection)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return { paidPosts: paid.map(toDetail), freePosts: free.map(toDetail) };
}

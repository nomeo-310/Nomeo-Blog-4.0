// app/api/posts/[slug]/remove/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { getCurrentUser } from "@/lib/session";
import { adjustTopicPostCounts } from "@/services/topic-services";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[slug]/remove
 * Accepts either a MongoDB ObjectId OR a slug string.
 * --------------------------------
 * Author-only. Soft-removes a post: hides it from every public surface
 * (home feed, search, profile, /post/[slug] — all filter isRemoved) while
 * leaving `status` untouched, so restoring brings back exactly what it was
 * (draft or published). The post keeps appearing in the author's own
 * dashboard list (app/dashboard/posts/page.tsx's getMyPosts deliberately
 * doesn't filter isRemoved) so it can still be edited, restored, or
 * permanently deleted (DELETE /api/posts/[slug], which requires isRemoved).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    await connectDB();

    const post = mongoose.isValidObjectId(slug)
      ? await Post.findById(slug)
      : await Post.findOne({ slug });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (String(post.authorId) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!post.isRemoved) {
      const body = await req.json().catch(() => ({}));
      post.isRemoved = true;
      post.removedBy = new mongoose.Types.ObjectId(user.id);
      post.removedAt = new Date();
      post.removalReason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : undefined;
      await post.save();

      // A removed post is hidden everywhere, so it should stop counting
      // toward its tags' Topic.postsCount (trending/hero eligibility) —
      // status stays "published" (untouched, for restore), only the
      // denormalised topic counter reacts.
      if (post.status === "published" && post.tags?.length) {
        await adjustTopicPostCounts(post.tags, []);
      }
    }

    return NextResponse.json({ success: true, isRemoved: true });
  } catch (err) {
    console.error("[POST /api/posts/[slug]/remove]", err);
    return NextResponse.json({ error: "Failed to remove post" }, { status: 500 });
  }
}

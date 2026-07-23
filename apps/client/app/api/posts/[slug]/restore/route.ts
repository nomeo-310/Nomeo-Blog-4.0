// app/api/posts/[slug]/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { getCurrentUser } from "@/lib/session";
import { adjustTopicPostCounts } from "@/services/topic-services";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[slug]/restore
 * Accepts either a MongoDB ObjectId OR a slug string.
 * ---------------------------------
 * Author-only. Undoes a soft-removal (see .../remove) — clears isRemoved
 * and the removal audit fields. `status` was never touched by remove, so
 * the post reappears exactly as it was (still draft stays draft, still
 * published stays published — no re-publish step needed).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

    if (post.isRemoved) {
      post.isRemoved = false;
      post.removedBy = undefined;
      post.removedAt = undefined;
      post.removalReason = undefined;
      await post.save();

      // Mirror of remove's decrement — a restored published post starts
      // counting toward its tags' Topic.postsCount again.
      if (post.status === "published" && post.tags?.length) {
        await adjustTopicPostCounts([], post.tags);
      }
    }

    return NextResponse.json({ success: true, isRemoved: false });
  } catch (err) {
    console.error("[POST /api/posts/[slug]/restore]", err);
    return NextResponse.json({ error: "Failed to restore post" }, { status: 500 });
  }
}

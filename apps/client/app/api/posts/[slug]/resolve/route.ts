// app/api/posts/[slug]/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[slug]/resolve
 * Accepts either a MongoDB ObjectId OR a slug string — always returns the
 * canonical slug. Lets a caller that only has a Post _id (e.g. a
 * notification's entityId, which is always the Mongo _id, never the slug)
 * build a working /post/[slug] link instead of guessing wrong and hitting
 * a 404.
 *
 * Public; only resolves published, non-removed posts — the same
 * visibility a guest hitting /post/[slug] directly would have. Returns
 * { slug: null } (404) for anything else — a draft, a removed post, or an
 * id that doesn't exist — so callers can treat null as "don't navigate"
 * instead of erroring.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const identifier = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
    const post = await Post.findOne(
      { ...identifier, status: "published", isRemoved: { $ne: true } },
      { slug: 1 }
    ).lean<{ slug: string } | null>();

    if (!post) return NextResponse.json({ slug: null }, { status: 404 });
    return NextResponse.json({ slug: post.slug });
  } catch (err) {
    console.error("[GET /api/posts/[slug]/resolve]", err);
    return NextResponse.json({ slug: null }, { status: 500 });
  }
}

// app/api/posts/[slug]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Reaction } from "@/models/reaction";
import { Post } from "@/models/post";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to like posts" }, { status: 401 });

    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    await connectDB();
    const post = await Post.findOne({ slug, status: "published" }).select("_id").lean();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const uid = new mongoose.Types.ObjectId(user.id);
    const pid = (post as any)._id as mongoose.Types.ObjectId;

    const existing = await Reaction.findOne({ userId: uid, targetId: pid, targetType: "post" });
    if (existing) {
      await existing.deleteOne();
      const unliked = await Post.findByIdAndUpdate(pid, { $inc: { likesCount: -1 } }, { new: true });
      return NextResponse.json({ liked: false, likesCount: unliked?.likesCount ?? 0 });
    }
    await Reaction.create({ userId: uid, targetId: pid, targetType: "post", type: "like" });
    const liked = await Post.findByIdAndUpdate(pid, { $inc: { likesCount: 1 } }, { new: true });
    return NextResponse.json({ liked: true, likesCount: liked?.likesCount ?? 0 });
  } catch (err) {
    console.error("[POST /api/posts/[id]/like]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
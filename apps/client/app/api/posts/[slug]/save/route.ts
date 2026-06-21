// app/api/posts/[slug]/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[slug]/save
 * ----------------------------
 * Toggles save on a post. Uses the saved_posts collection directly
 * (no model import — same pattern as the dashboard saved page).
 * Returns { saved: boolean, savesCount: number }
 */
export async function POST( _req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in to save posts" }, { status: 401 });

    const { slug } = await params;
    if (!slug)
      return NextResponse.json({ error: "Invalid" }, { status: 400 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const post = await Post.findOne({ slug, status: "published" })
      .select("_id")
      .lean() as any;
    if (!post)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const uid = new mongoose.Types.ObjectId(user.id);
    const pid = post._id as mongoose.Types.ObjectId;

    const existing = await db.collection("saved_posts").findOne({
      userId: uid,
      postId: pid,
    });

    if (existing) {
      // Unsave
      await db.collection("saved_posts").deleteOne({ userId: uid, postId: pid });
      const updated = await Post.findByIdAndUpdate(
        pid,
        { $inc: { savesCount: -1 } },
        { new: true }
      );
      return NextResponse.json({ saved: false, savesCount: updated?.savesCount ?? 0 });
    }

    // Save
    await db.collection("saved_posts").insertOne({
      userId:    uid,
      postId:    pid,
      createdAt: new Date(),
    });
    const updated = await Post.findByIdAndUpdate(
      pid,
      { $inc: { savesCount: 1 } },
      { new: true }
    );
    return NextResponse.json({ saved: true, savesCount: updated?.savesCount ?? 0 });
  } catch (err) {
    console.error("[POST /api/posts/[slug]/save]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
// app/api/comments/[id]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Reaction } from "@/models/reaction";
import { Comment } from "@/models/comment";
import { getCurrentUser } from "@/lib/session";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: "comment-like:" + ip, limit: 60, windowSeconds: 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to like comments" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ error: "Invalid" }, { status: 400 });

    await connectDB();
    const uid = new mongoose.Types.ObjectId(user.id);
    const cid = new mongoose.Types.ObjectId(id);

    const existing = await Reaction.findOne({ userId: uid, targetId: cid, targetType: "comment" });
    if (existing) {
      await existing.deleteOne();
      await Comment.findByIdAndUpdate(cid, { $inc: { likesCount: -1 } });
      return NextResponse.json({ liked: false });
    }
    await Reaction.create({ userId: uid, targetId: cid, targetType: "comment", type: "like" });
    await Comment.findByIdAndUpdate(cid, { $inc: { likesCount: 1 } });
    return NextResponse.json({ liked: true });
  } catch (err) {
    console.error("[POST /api/comments/[id]/like]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
// app/api/posts/[slug]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Comment } from "@/models/comment";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[id]/comments?page=1
 * ------------------------------------
 * Returns top-level comments with embedded replies, 20 per page.
 *
 * Shape matches comment-section.tsx exactly:
 *   { id, body, authorName, authorUsername, authorAvatar,
 *     likesCount, isLiked, isOwnComment, isDeletedByAuthor,
 *     createdAt, replies[] }
 *
 * isLiked and isOwnComment require knowing the current user —
 * resolved via getCurrentUser() server-side.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ comments: [], total: 0 }, { status: 400 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ comments: [], total: 0 });

    // Resolve slug → ObjectId once
    const { Post } = await import("@/models/post");
    const postDoc = await Post.findOne({ slug, status: "published" }).select("_id").lean();
    if (!postDoc) return NextResponse.json({ comments: [], total: 0 });

    const user  = await getCurrentUser();
    const uid   = user?.id ?? null;
    const page  = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
    const limit = 20;
    const skip  = (page - 1) * limit;
    const pid   = (postDoc as any)._id as mongoose.Types.ObjectId;

    // ── Top-level comments ───────────────────────────────────────────
    const [topRaw, total] = await Promise.all([
      Comment.find({
        postId: pid, parentId: null,
        isRemoved: false, status: { $ne: "removed" },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments({
        postId: pid, parentId: null,
        isRemoved: false, status: { $ne: "removed" },
      }),
    ]);

    if (!topRaw.length) return NextResponse.json({ comments: [], total });

    // ── Replies for those top-level comments ─────────────────────────
    const topIds = topRaw.map((c: any) => c._id);
    const repliesRaw = await Comment.find({
      postId: pid,
      parentId: { $in: topIds },
      isRemoved: false,
      status: { $ne: "removed" },
    })
      .sort({ createdAt: 1 })
      .lean();

    // ── Batch-fetch all author profiles ──────────────────────────────
    const allAuthorIds = [
      ...new Set([
        ...topRaw.map((c: any) => String(c.authorId)),
        ...repliesRaw.map((c: any) => String(c.authorId)),
      ].filter((id) => mongoose.Types.ObjectId.isValid(id))),
    ];

    const profiles = allAuthorIds.length
      ? await db.collection("profiles")
          .find(
            { userId: { $in: allAuthorIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } }
          )
          .toArray()
      : [];
    const pm = new Map(profiles.map((p: any) => [String(p.userId), p]));

    // ── Batch-fetch reactions by the current user ─────────────────────
    // So we can set isLiked correctly without N+1 queries.
    const allCommentIds = [...topRaw, ...repliesRaw].map((c: any) => c._id);
    let likedSet = new Set<string>();
    if (uid && allCommentIds.length) {
      const reactions = await db.collection("reactions")
        .find({
          userId:     new mongoose.Types.ObjectId(uid),
          targetType: "comment",
          targetId:   { $in: allCommentIds },
        })
        .project({ targetId: 1 })
        .toArray();
      likedSet = new Set(reactions.map((r: any) => String(r.targetId)));
    }

    // ── Shape a single comment / reply ───────────────────────────────
    const shape = (c: any) => {
      const p      = pm.get(String(c.authorId));
      const cid    = String(c._id);
      const isDeleted = !!c.isDeletedByAuthor;
      return {
        id:                cid,
        body:              isDeleted ? "" : String(c.body || ""),
        authorName:        String(p?.displayName || p?.username || "Nomeo user"),
        authorUsername:    String(p?.username || ""),
        authorAvatar:      String(p?.profileImage?.url || ""),
        likesCount:        Number(c.likesCount || 0),
        isLiked:           likedSet.has(cid),
        isOwnComment:      uid ? String(c.authorId) === uid : false,
        isDeletedByAuthor: isDeleted,
        createdAt:         c.createdAt instanceof Date
          ? c.createdAt.toISOString()
          : new Date().toISOString(),
      };
    };

    // ── Group replies by parentId ─────────────────────────────────────
    const repliesByParent = new Map<string, any[]>();
    repliesRaw.forEach((r: any) => {
      const k = String(r.parentId);
      if (!repliesByParent.has(k)) repliesByParent.set(k, []);
      repliesByParent.get(k)!.push(shape(r));
    });

    const comments = topRaw.map((c: any) => ({
      ...shape(c),
      replies: repliesByParent.get(String(c._id)) ?? [],
    }));

    return NextResponse.json({ comments, total });
  } catch (err) {
    console.error("[GET /api/posts/[id]/comments]", err);
    return NextResponse.json({ comments: [], total: 0 }, { status: 500 });
  }
}

/**
 * POST /api/posts/[id]/comments
 * ------------------------------
 * Creates a top-level comment or a reply (body + optional parentId).
 * Signed-in users only.
 * Returns { id } of the created comment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });

    const { slug } = await params;
    if (!slug)
      return NextResponse.json({ error: "Invalid post slug" }, { status: 400 });

    const { body, parentId } = await req.json();
    if (!body?.trim())
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    if (body.trim().length > 2000)
      return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });

    await connectDB();
    const { Post } = await import("@/models/post");

    const postDoc = await Post.findOne({ slug, status: "published" }).select("_id").lean();
    if (!postDoc)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const pid = (postDoc as any)._id as mongoose.Types.ObjectId;
    const uid = new mongoose.Types.ObjectId(user.id);

    // Validate parentId if replying
    let resolvedParentId: mongoose.Types.ObjectId | null = null;
    if (parentId && mongoose.isValidObjectId(parentId)) {
      const parent = await Comment.findById(parentId).lean();
      if (!parent)
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      resolvedParentId = new mongoose.Types.ObjectId(parentId);
    }

    const comment = await Comment.create({
      postId:     pid,
      authorId:   uid,
      parentId:   resolvedParentId,
      body:       body.trim(),
      status:     "visible",
      likesCount: 0,
    });

    // Increment commentsCount on post (top-level comments only)
    if (!resolvedParentId) {
      await Post.findByIdAndUpdate(pid, { $inc: { commentsCount: 1 } });
    }

    return NextResponse.json({ id: String(comment._id) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/posts/[id]/comments]", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
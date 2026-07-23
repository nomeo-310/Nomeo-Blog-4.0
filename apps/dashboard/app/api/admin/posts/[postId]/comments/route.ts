// app/api/admin/posts/[postId]/comments/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

interface CommentRow {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  body: string;
  status: string;
  isRemoved: boolean;
  isDeletedByAuthor: boolean;
  likesCount: number;
  repliesCount: number;
  pendingReportsCount: number;
  isAuthorReply: boolean;
  createdAt: Date;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const searchParams = new URL(req.url).searchParams;

    const hasOpenReports = searchParams.get("hasOpenReports") === "true";
    const page  = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));

    const match: Record<string, unknown> = { postId: new mongoose.Types.ObjectId(postId) };
    if (hasOpenReports) match.pendingReportsCount = { $gt: 0 };

    const [facetResult] = await db
      .collection("comments")
      .aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { createdAt: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  authorId: 1, parentId: 1, body: 1, status: 1, isRemoved: 1,
                  isDeletedByAuthor: 1, likesCount: 1, repliesCount: 1,
                  pendingReportsCount: 1, isAuthorReply: 1, createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as CommentRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].map((id) => new mongoose.Types.ObjectId(id));
    const authors = authorIds.length
      ? await db.collection("user").find({ _id: { $in: authorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const authorById = new Map(authors.map((a) => [String(a._id), { name: a.name as string, email: a.email as string }]));

    const comments = rows.map((r) => ({
      id:      String(r._id),
      author:  { id: String(r.authorId), ...(authorById.get(String(r.authorId)) ?? { name: "Unknown", email: "" }) },
      parentId: r.parentId ? String(r.parentId) : null,
      body: r.body,
      status: r.status,
      isRemoved: r.isRemoved,
      isDeletedByAuthor: r.isDeletedByAuthor,
      likesCount: r.likesCount,
      repliesCount: r.repliesCount,
      pendingReportsCount: r.pendingReportsCount,
      isAuthorReply: r.isAuthorReply,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      postId,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      comments,
    });
  } catch (error) {
    console.error("[admin/posts/:postId/comments] failed to list comments:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

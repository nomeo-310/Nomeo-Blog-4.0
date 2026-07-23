// app/api/admin/posts/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:        { createdAt: -1 },
  oldest:        { createdAt: 1 },
  most_viewed:   { viewsCount: -1 },
  most_reported: { pendingReportsCount: -1, createdAt: -1 },
};

interface PostListRow {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  authorId: mongoose.Types.ObjectId;
  access: string;
  status: string;
  isFeatured: boolean;
  isRemoved: boolean;
  pendingReportsCount: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  tags?: string[];
  category?: string;
  publishedAt?: Date;
  createdAt: Date;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const status         = params.get("status") ?? "all";
    const access         = params.get("access") ?? "all";
    const topic          = params.get("topic");
    const authorIdParam  = params.get("authorId");
    const featuredParam  = params.get("featured");
    const hasOpenReports = params.get("hasOpenReports") === "true";
    const search         = params.get("search")?.trim();
    const sortByParam    = params.get("sortBy") ?? "newest";
    const sortBy         = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page           = Math.max(1, Number(params.get("page")) || 1);
    const limit          = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (status !== "all") match.status = status;
    if (access === "free" || access === "paid") match.access = access;
    if (topic) match.tags = topic;
    if (featuredParam === "true") match.isFeatured = true;
    if (featuredParam === "false") match.isFeatured = false;
    if (hasOpenReports) match.pendingReportsCount = { $gt: 0 };
    if (search) match.title = { $regex: escapeRegExp(search), $options: "i" };
    if (authorIdParam && mongoose.Types.ObjectId.isValid(authorIdParam)) {
      match.authorId = new mongoose.Types.ObjectId(authorIdParam);
    }

    const [facetResult] = await db
      .collection("posts")
      .aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  title: 1, slug: 1, authorId: 1, access: 1, status: 1,
                  isFeatured: 1, isRemoved: 1, pendingReportsCount: 1,
                  viewsCount: 1, likesCount: 1, commentsCount: 1, savesCount: 1,
                  tags: 1, category: 1, publishedAt: 1, createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as PostListRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].map((id) => new mongoose.Types.ObjectId(id));
    const authors = authorIds.length
      ? await db.collection("user").find({ _id: { $in: authorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const authorById = new Map(authors.map((a) => [String(a._id), { name: a.name as string, email: a.email as string }]));

    const posts = rows.map((r) => ({
      id:          String(r._id),
      title:       r.title,
      slug:        r.slug,
      author:      { id: String(r.authorId), ...(authorById.get(String(r.authorId)) ?? { name: "Unknown", email: "" }) },
      access:      r.access,
      status:      r.status,
      isFeatured:  r.isFeatured,
      isRemoved:   r.isRemoved,
      pendingReportsCount: r.pendingReportsCount,
      viewsCount:    r.viewsCount,
      likesCount:    r.likesCount,
      commentsCount: r.commentsCount,
      savesCount:    r.savesCount,
      tags:        r.tags ?? [],
      category:    r.category,
      publishedAt: r.publishedAt,
      createdAt:   r.createdAt,
    }));

    return NextResponse.json({
      filters: { status, access, topic, authorId: authorIdParam, featured: featuredParam, hasOpenReports, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      posts,
    });
  } catch (error) {
    console.error("[admin/posts] failed to list posts:", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

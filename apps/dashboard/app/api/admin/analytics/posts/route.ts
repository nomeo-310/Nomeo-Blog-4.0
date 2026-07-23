// app/api/admin/analytics/posts/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { resolveWindow }               from "@/lib/analytics/date-range";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Composite ranking score: heavier engagement actions weigh more than passive views. */
const ENGAGEMENT_SCORE_EXPR = {
  $add: [
    "$likesCount",
    { $multiply: ["$commentsCount", 2] },
    { $multiply: ["$savesCount", 3] },
    { $multiply: ["$readStats.completedReads", 4] },
  ],
};

interface PostLeaderboardRow {
  _id:         mongoose.Types.ObjectId;
  title:       string;
  slug:        string;
  authorId:    mongoose.Types.ObjectId;
  access:      string;
  status:      string;
  publishedAt?: Date;
  tags?:       string[];
  category?:   string;
  viewsCount:  number;
  likesCount:  number;
  commentsCount: number;
  savesCount:  number;
  subscriberReadMinutes: number;
  readStats: { totalReads: number; completedReads: number; totalDurationSecs: number };
  completionRatePct: number;
  engagementScore:   number;
}

const SORT_FIELD_MAP: Record<string, string> = {
  views:          "viewsCount",
  likes:          "likesCount",
  comments:       "commentsCount",
  saves:          "savesCount",
  reads:          "readStats.totalReads",
  completionRate: "completionRatePct",
  readMinutes:    "subscriberReadMinutes",
  engagement:     "engagementScore",
};

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const rangeParam = params.get("range");
    const isAllTime   = rangeParam === "all" && !params.get("from");
    const window      = isAllTime ? null : resolveWindow(params);

    const access     = params.get("access") ?? "all";
    const topic      = params.get("topic");
    const creatorIdParam = params.get("creatorId");
    const search     = params.get("search")?.trim();
    const sortBy     = SORT_FIELD_MAP[params.get("sortBy") ?? "engagement"] ? (params.get("sortBy") ?? "engagement") : "engagement";
    const order      = params.get("order") === "asc" ? 1 : -1;
    const page       = Math.max(1, Number(params.get("page")) || 1);
    const limit      = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = { status: "published", isRemoved: { $ne: true } };
    if (access === "free" || access === "paid") match.access = access;
    if (topic) match.tags = topic;
    if (search) match.title = { $regex: escapeRegExp(search), $options: "i" };
    if (window) match.publishedAt = { $gte: window.since, $lte: window.until };

    if (creatorIdParam && mongoose.Types.ObjectId.isValid(creatorIdParam)) {
      match.authorId = new mongoose.Types.ObjectId(creatorIdParam);
    }

    const readMatchExpr: unknown[] = [{ $eq: ["$postId", "$$pid"] }];
    if (window) readMatchExpr.push({ $gte: ["$createdAt", window.since] }, { $lte: ["$createdAt", window.until] });

    const [facetResult] = await db
      .collection("posts")
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "post_reads",
            let:  { pid: "$_id" },
            pipeline: [
              { $match: { $expr: { $and: readMatchExpr } } },
              {
                $group: {
                  _id:               null,
                  totalReads:        { $sum: 1 },
                  completedReads:    { $sum: { $cond: ["$completedRead", 1, 0] } },
                  totalDurationSecs: { $sum: "$readDurationSeconds" },
                },
              },
            ],
            as: "readStats",
          },
        },
        {
          $addFields: {
            readStats: {
              $ifNull: [{ $arrayElemAt: ["$readStats", 0] }, { totalReads: 0, completedReads: 0, totalDurationSecs: 0 }],
            },
          },
        },
        {
          $addFields: {
            completionRatePct: {
              $cond: [
                { $gt: ["$readStats.totalReads", 0] },
                { $round: [{ $multiply: [{ $divide: ["$readStats.completedReads", "$readStats.totalReads"] }, 100] }, 1] },
                0,
              ],
            },
          },
        },
        { $addFields: { engagementScore: ENGAGEMENT_SCORE_EXPR } },
        {
          $facet: {
            data: [
              { $sort: { [SORT_FIELD_MAP[sortBy]]: order, _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  title: 1, slug: 1, authorId: 1, access: 1, status: 1,
                  publishedAt: 1, tags: 1, category: 1,
                  viewsCount: 1, likesCount: 1, commentsCount: 1, savesCount: 1,
                  subscriberReadMinutes: 1, readStats: 1, completionRatePct: 1, engagementScore: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as PostLeaderboardRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].map((id) => new mongoose.Types.ObjectId(id));
    const authors = authorIds.length
      ? await db.collection("user").find({ _id: { $in: authorIds } }, { projection: { name: 1 } }).toArray()
      : [];
    const authorNameById = new Map(authors.map((a) => [String(a._id), a.name as string]));

    const posts = rows.map((r) => ({
      id:          String(r._id),
      title:       r.title,
      slug:        r.slug,
      author:      { id: String(r.authorId), name: authorNameById.get(String(r.authorId)) ?? "Unknown" },
      access:      r.access,
      status:      r.status,
      publishedAt: r.publishedAt,
      tags:        r.tags ?? [],
      category:    r.category,
      metrics: {
        views:               r.viewsCount,
        likes:               r.likesCount,
        comments:            r.commentsCount,
        saves:               r.savesCount,
        reads:               r.readStats.totalReads,
        completedReads:      r.readStats.completedReads,
        completionRatePct:   r.completionRatePct,
        avgReadDurationSecs: r.readStats.totalReads > 0 ? Math.round(r.readStats.totalDurationSecs / r.readStats.totalReads) : 0,
        subscriberReadMinutes: r.subscriberReadMinutes,
        engagementScore:     r.engagementScore,
      },
    }));

    return NextResponse.json({
      range: isAllTime ? "all" : (window?.range ?? "30d"),
      filters: { access, topic, creatorId: creatorIdParam, search },
      sortBy,
      order: order === 1 ? "asc" : "desc",
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      posts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/analytics/posts] failed:", error);
    return NextResponse.json({ error: "Failed to load post analytics" }, { status: 500 });
  }
}

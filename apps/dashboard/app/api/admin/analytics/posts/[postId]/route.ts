// app/api/admin/analytics/posts/[postId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { dateTruncStage, fillSeries }  from "@/lib/analytics/date-range";

export const dynamic = "force-dynamic";

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
    const postObjectId = new mongoose.Types.ObjectId(postId);

    const post = await db.collection("posts").findOne({ _id: postObjectId });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Reads-over-time is bounded to at most the last 90 days so old posts don't
    // render years of daily buckets; new posts show their full lifetime so far.
    const publishedAt = (post.publishedAt as Date | undefined) ?? (post.createdAt as Date);
    const seriesSince = publishedAt > ninetyDaysAgo ? publishedAt : ninetyDaysAgo;

    const [
      readStatsRows,
      uniqueReadersRows,
      accessMethodRows,
      readSeriesRows,
      reactionRows,
      commentDepthRows,
      earningsRows,
      platformBenchmarkRows,
    ] = await Promise.all([
      db.collection("post_reads")
        .aggregate([
          { $match: { postId: postObjectId } },
          {
            $group: {
              _id: null,
              totalReads:        { $sum: 1 },
              completedReads:    { $sum: { $cond: ["$completedRead", 1, 0] } },
              totalDurationSecs: { $sum: "$readDurationSeconds" },
            },
          },
        ])
        .toArray(),
      db.collection("post_reads")
        .aggregate([{ $match: { postId: postObjectId } }, { $group: { _id: "$userId" } }, { $count: "count" }])
        .toArray(),
      db.collection("post_reads")
        .aggregate([
          { $match: { postId: postObjectId } },
          { $group: { _id: "$accessMethod", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("post_reads")
        .aggregate([
          { $match: { postId: postObjectId, createdAt: { $gte: seriesSince } } },
          { $group: { _id: dateTruncStage("createdAt", "day"), value: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("reactions")
        .aggregate([
          { $match: { targetType: "post", targetId: postObjectId } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("comments")
        .aggregate([
          { $match: { postId: postObjectId, isRemoved: { $ne: true } } },
          { $group: { _id: { $cond: [{ $eq: ["$parentId", null] }, "top_level", "reply"] }, count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("creator_earnings")
        .aggregate([
          { $unwind: "$topPosts" },
          { $match: { "topPosts.postId": postObjectId } },
          {
            $group: {
              _id:                 null,
              totalGrossAmount:    { $sum: "$topPosts.grossContribution" },
              totalReadMinutes:    { $sum: "$topPosts.weightedReadMinutes" },
              periodsCount:        { $sum: 1 },
            },
          },
        ])
        .toArray(),
      db.collection("post_reads")
        .aggregate([
          { $match: { createdAt: { $gte: ninetyDaysAgo } } },
          {
            $lookup: {
              from: "posts",
              localField: "postId",
              foreignField: "_id",
              as: "post",
            },
          },
          { $unwind: "$post" },
          { $match: { "post.access": post.access, "post.status": "published" } },
          {
            $group: {
              _id:            null,
              totalReads:     { $sum: 1 },
              completedReads: { $sum: { $cond: ["$completedRead", 1, 0] } },
              postIds:        { $addToSet: "$postId" },
            },
          },
        ])
        .toArray(),
    ]);

    const readStats = readStatsRows[0] ?? { totalReads: 0, completedReads: 0, totalDurationSecs: 0 };
    const uniqueReaders = uniqueReadersRows[0]?.count ?? 0;

    const accessMethodBreakdown = Object.fromEntries(
      (accessMethodRows as { _id: string; count: number }[]).map((r) => [r._id, r.count])
    );

    const reactionBreakdown = (reactionRows as { _id: string; count: number }[]).map((r) => ({
      type: r._id,
      count: r.count,
    }));

    const commentDepth = Object.fromEntries(
      (commentDepthRows as { _id: string; count: number }[]).map((r) => [r._id, r.count])
    );

    const earnings = earningsRows[0] ?? { totalGrossAmount: 0, totalReadMinutes: 0, periodsCount: 0 };

    const benchmark = platformBenchmarkRows[0] ?? { totalReads: 0, completedReads: 0, postIds: [] };
    const benchmarkPostCount = (benchmark.postIds as unknown[]).length;
    const platformAvgCompletionRatePct = benchmark.totalReads > 0
      ? Math.round((benchmark.completedReads / benchmark.totalReads) * 1000) / 10
      : 0;

    // Platform average views/likes/comments/saves across all published posts of the same access tier.
    const [tierAverages] = await db
      .collection("posts")
      .aggregate([
        { $match: { status: "published", isRemoved: { $ne: true }, access: post.access } },
        {
          $group: {
            _id: null,
            avgViews:    { $avg: "$viewsCount" },
            avgLikes:    { $avg: "$likesCount" },
            avgComments: { $avg: "$commentsCount" },
            avgSaves:    { $avg: "$savesCount" },
            count:       { $sum: 1 },
          },
        },
      ])
      .toArray();

    const coAuthorIds = ((post.coAuthors as { userId: mongoose.Types.ObjectId }[]) ?? []).map((c) => c.userId);
    const peopleIds = [post.authorId as mongoose.Types.ObjectId, ...coAuthorIds];
    const people = await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1 } }).toArray();
    const nameById = new Map(people.map((p) => [String(p._id), p.name as string]));

    return NextResponse.json({
      post: {
        id:          String(post._id),
        title:       post.title,
        slug:        post.slug,
        author:      { id: String(post.authorId), name: nameById.get(String(post.authorId)) ?? "Unknown" },
        coAuthors: ((post.coAuthors as { userId: mongoose.Types.ObjectId; role: string; status: string }[]) ?? []).map((c) => ({
          id:     String(c.userId),
          name:   nameById.get(String(c.userId)) ?? "Unknown",
          role:   c.role,
          status: c.status,
        })),
        tags:        post.tags ?? [],
        category:    post.category,
        access:      post.access,
        status:      post.status,
        publishedAt: post.publishedAt,
        readingTime: post.readingTime,
      },
      engagement: {
        views:               post.viewsCount ?? 0,
        likes:               post.likesCount ?? 0,
        comments:            post.commentsCount ?? 0,
        saves:               post.savesCount ?? 0,
        pendingReportsCount: post.pendingReportsCount ?? 0,
        commentDepth: {
          topLevel: commentDepth.top_level ?? 0,
          replies:  commentDepth.reply ?? 0,
        },
        reactionBreakdown,
      },
      reads: {
        totalReads:          readStats.totalReads,
        uniqueReaders,
        completedReads:      readStats.completedReads,
        completionRatePct:   readStats.totalReads > 0 ? Math.round((readStats.completedReads / readStats.totalReads) * 1000) / 10 : 0,
        avgReadDurationSecs: readStats.totalReads > 0 ? Math.round(readStats.totalDurationSecs / readStats.totalReads) : 0,
        subscriberReadMinutes: post.subscriberReadMinutes ?? 0,
        accessMethodBreakdown: {
          freePost:     accessMethodBreakdown.free_post ?? 0,
          freeCredit:   accessMethodBreakdown.free_credit ?? 0,
          subscription: accessMethodBreakdown.subscription ?? 0,
        },
        readSeries: fillSeries(readSeriesRows as { _id: Date; value: number }[], seriesSince, "day"),
      },
      earnings: {
        totalGrossAmount: earnings.totalGrossAmount,
        totalReadMinutes: earnings.totalReadMinutes,
        periodsCount:     earnings.periodsCount,
      },
      benchmark: {
        accessTier:                post.access,
        sampleWindowDays:          90,
        platformAvgCompletionRatePct,
        platformAvgViews:    tierAverages ? Math.round(tierAverages.avgViews) : 0,
        platformAvgLikes:    tierAverages ? Math.round(tierAverages.avgLikes * 10) / 10 : 0,
        platformAvgComments: tierAverages ? Math.round(tierAverages.avgComments * 10) / 10 : 0,
        platformAvgSaves:    tierAverages ? Math.round(tierAverages.avgSaves * 10) / 10 : 0,
        sampleSize:          benchmarkPostCount,
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[admin/analytics/posts/:postId] failed:", error);
    return NextResponse.json({ error: "Failed to load post analytics" }, { status: 500 });
  }
}

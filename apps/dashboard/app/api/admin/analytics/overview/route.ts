// app/api/admin/analytics/overview/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { resolveWindow, pctChange, dateTruncStage, fillSeries } from "@/lib/analytics/date-range";

export const dynamic = "force-dynamic";

const NON_ADMIN_ROLES = { role: { $nin: ["admin", "super_admin", "support"] } };

/** Normalises a subscription's price to a monthly-equivalent for MRR math. */
const MONTHLY_DIVISOR: Record<string, number> = {
  monthly:    1,
  quarterly:  3,
  biannually: 6,
  yearly:     12,
};

async function sumPendingReports(db: mongoose.mongo.Db): Promise<number> {
  const collections = ["posts", "comments", "lounge_messages"];
  const totals = await Promise.all(
    collections.map(async (collection) => {
      const [row] = await db
        .collection(collection)
        .aggregate([
          { $match: { pendingReportsCount: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: "$pendingReportsCount" } } },
        ])
        .toArray();
      return row?.total ?? 0;
    })
  );
  return totals.reduce((a, b) => a + b, 0);
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const { range, since, until, prevSince, prevUntil, bucket } = resolveWindow(new URL(req.url).searchParams);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      // ── Growth ──────────────────────────────────────────────────────
      totalUsers,
      newUsersInRange,
      newUsersPrevRange,
      totalCreators,
      totalProfiles,
      onboardedProfiles,
      signupSeriesRows,

      // ── Engagement ──────────────────────────────────────────────────
      postsPublishedInRange,
      postsPublishedPrevRange,
      readStatsRows,
      readerActivityRows,
      likesInRange,
      commentsInRange,
      readSeriesRows,

      // ── Revenue ───────────────────────────────────────────────────
      revenueSeriesRows,
      revenueInRange,
      revenuePrevRange,
      activeSubsByInterval,
      cancelledInRange,
      paymentStatusRows,
      planCounts,

      // ── Creator economy ──────────────────────────────────────────
      applicationFunnelRows,
      latestPeriod,

      // ── Content ────────────────────────────────────────────────────
      accessMixRows,
      topTopicsRows,

      // ── Moderation ─────────────────────────────────────────────────
      pendingReports,
      bannedUsers,

      // ── Retention (fixed 6-month lookback, independent of `range`) ──
      cohortRows,
    ] = await Promise.all([
      db.collection("user").countDocuments(NON_ADMIN_ROLES),
      db.collection("user").countDocuments({ ...NON_ADMIN_ROLES, createdAt: { $gte: since, $lte: until } }),
      db.collection("user").countDocuments({ ...NON_ADMIN_ROLES, createdAt: { $gte: prevSince, $lte: prevUntil } }),
      db.collection("user").countDocuments({ role: "creator" }),
      db.collection("profiles").countDocuments({}),
      db.collection("profiles").countDocuments({ onboardingCompleted: true }),
      db.collection("user")
        .aggregate([
          { $match: { ...NON_ADMIN_ROLES, createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: dateTruncStage("createdAt", bucket), value: { $sum: 1 } } },
        ])
        .toArray(),

      db.collection("posts").countDocuments({ status: "published", isRemoved: { $ne: true }, publishedAt: { $gte: since, $lte: until } }),
      db.collection("posts").countDocuments({ status: "published", isRemoved: { $ne: true }, publishedAt: { $gte: prevSince, $lte: prevUntil } }),
      db.collection("post_reads")
        .aggregate([
          { $match: { createdAt: { $gte: since, $lte: until } } },
          {
            $group: {
              _id: null,
              totalReads:        { $sum: 1 },
              completedReads:    { $sum: { $cond: ["$completedRead", 1, 0] } },
              subscriberReads:   { $sum: { $cond: ["$readerIsSubscriber", 1, 0] } },
              totalDurationSecs: { $sum: "$readDurationSeconds" },
            },
          },
        ])
        .toArray(),
      db.collection("post_reads")
        .aggregate([
          { $match: { createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: "$userId" } },
          { $count: "activeReaders" },
        ])
        .toArray(),
      db.collection("reactions").countDocuments({ createdAt: { $gte: since, $lte: until } }),
      db.collection("comments").countDocuments({ createdAt: { $gte: since, $lte: until } }),
      db.collection("post_reads")
        .aggregate([
          { $match: { createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: dateTruncStage("createdAt", bucket), value: { $sum: 1 } } },
        ])
        .toArray(),

      db.collection("payments")
        .aggregate([
          { $match: { gatewayStatus: "success", createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: dateTruncStage("createdAt", bucket), value: { $sum: "$amountPaid" } } },
        ])
        .toArray(),
      db.collection("payments")
        .aggregate([
          { $match: { gatewayStatus: "success", createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } },
        ])
        .toArray()
        .then((r) => r[0]?.total ?? 0),
      db.collection("payments")
        .aggregate([
          { $match: { gatewayStatus: "success", createdAt: { $gte: prevSince, $lte: prevUntil } } },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } },
        ])
        .toArray()
        .then((r) => r[0]?.total ?? 0),
      db.collection("subscriptions")
        .aggregate([
          { $match: { status: "active" } },
          { $group: { _id: "$interval", totalPrice: { $sum: "$priceAmount" }, count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("subscriptions").countDocuments({ status: "cancelled", cancelledAt: { $gte: since, $lte: until } }),
      db.collection("payments")
        .aggregate([
          { $match: { createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: "$gatewayStatus", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("subscriptions")
        .aggregate([
          { $match: { status: "active" } },
          { $group: { _id: "$planId", count: { $sum: 1 } } },
        ])
        .toArray(),

      db.collection("creator_applications")
        .aggregate([
          { $match: { createdAt: { $gte: since, $lte: until } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("platform_earning_periods")
        .find({})
        .sort({ billingPeriod: -1 })
        .limit(1)
        .toArray()
        .then((r) => r[0] ?? null),

      db.collection("posts")
        .aggregate([
          { $match: { status: "published", isRemoved: { $ne: true } } },
          { $group: { _id: "$access", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("posts")
        .aggregate([
          { $match: { status: "published", isRemoved: { $ne: true }, publishedAt: { $gte: since, $lte: until } } },
          { $unwind: "$tags" },
          {
            $group: {
              _id:        "$tags",
              postsCount: { $sum: 1 },
              totalViews: { $sum: "$viewsCount" },
              totalLikes: { $sum: "$likesCount" },
            },
          },
          { $sort: { postsCount: -1 } },
          { $limit: 8 },
        ])
        .toArray(),

      sumPendingReports(db),
      db.collection("profiles").countDocuments({ banStatus: "banned" }),

      db.collection("user")
        .aggregate([
          { $match: { ...NON_ADMIN_ROLES, createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id:        dateTruncStage("createdAt", "month"),
              cohortSize: { $sum: 1 },
              userIds:    { $push: "$_id" },
            },
          },
          {
            $lookup: {
              from: "post_reads",
              let:  { ids: "$userIds" },
              pipeline: [
                { $match: { $expr: { $and: [{ $in: ["$userId", "$$ids"] }, { $gte: ["$createdAt", last30Days] }] } } },
                { $group: { _id: "$userId" } },
              ],
              as: "activeUsers",
            },
          },
          {
            $project: {
              cohortMonth: "$_id",
              cohortSize:  1,
              activeCount: { $size: "$activeUsers" },
            },
          },
          { $sort: { cohortMonth: 1 } },
        ])
        .toArray(),
    ]);

    /* ── Growth ──────────────────────────────────────────────────────── */

    const growth = {
      totalUsers,
      newUsersInRange,
      growthPct:              pctChange(newUsersInRange, newUsersPrevRange),
      totalCreators,
      creatorConversionPct:   totalUsers > 0 ? Math.round((totalCreators / totalUsers) * 1000) / 10 : 0,
      onboardingCompletionPct: totalProfiles > 0 ? Math.round((onboardedProfiles / totalProfiles) * 1000) / 10 : 0,
      signupSeries: fillSeries(signupSeriesRows as { _id: Date; value: number }[], since, bucket, until),
    };

    /* ── Engagement ──────────────────────────────────────────────────── */

    const readStats = readStatsRows[0] ?? { totalReads: 0, completedReads: 0, subscriberReads: 0, totalDurationSecs: 0 };
    const activeReaders = readerActivityRows[0]?.activeReaders ?? 0;

    const engagement = {
      postsPublishedInRange,
      postsGrowthPct:       pctChange(postsPublishedInRange, postsPublishedPrevRange),
      activeReaders,
      totalReads:           readStats.totalReads,
      completionRatePct:    readStats.totalReads > 0 ? Math.round((readStats.completedReads / readStats.totalReads) * 1000) / 10 : 0,
      avgReadDurationSecs:  readStats.totalReads > 0 ? Math.round(readStats.totalDurationSecs / readStats.totalReads) : 0,
      subscriberReadSharePct: readStats.totalReads > 0 ? Math.round((readStats.subscriberReads / readStats.totalReads) * 1000) / 10 : 0,
      likesInRange,
      commentsInRange,
      readSeries: fillSeries(readSeriesRows as { _id: Date; value: number }[], since, bucket, until),
    };

    /* ── Revenue ───────────────────────────────────────────────────── */

    let mrr = 0;
    let activeSubscriptions = 0;
    for (const row of activeSubsByInterval as { _id: string; totalPrice: number; count: number }[]) {
      const divisor = MONTHLY_DIVISOR[row._id] ?? 1;
      mrr += row.totalPrice / divisor;
      activeSubscriptions += row.count;
    }
    mrr = Math.round(mrr);

    const paymentTotals = (paymentStatusRows as { _id: string; count: number }[]).reduce(
      (acc, row) => {
        acc.total += row.count;
        if (row._id === "success") acc.success = row.count;
        return acc;
      },
      { total: 0, success: 0 }
    );

    const planIds = (planCounts as { _id: mongoose.Types.ObjectId; count: number }[]).map((p) => p._id);
    const plans = planIds.length
      ? await db.collection("plans").find({ _id: { $in: planIds } }, { projection: { name: 1 } }).toArray()
      : [];
    const planNameById = new Map(plans.map((p) => [String(p._id), p.name as string]));

    const revenue = {
      mrr,
      arpu: activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0,
      activeSubscriptions,
      revenueInRange,
      revenueGrowthPct: pctChange(revenueInRange, revenuePrevRange),
      cancelledInRange,
      churnRatePct: activeSubscriptions + cancelledInRange > 0
        ? Math.round((cancelledInRange / (activeSubscriptions + cancelledInRange)) * 1000) / 10
        : 0,
      paymentSuccessRatePct: paymentTotals.total > 0 ? Math.round((paymentTotals.success / paymentTotals.total) * 1000) / 10 : 100,
      planBreakdown: (planCounts as { _id: mongoose.Types.ObjectId; count: number }[])
        .map((p) => ({ planId: String(p._id), planName: planNameById.get(String(p._id)) ?? "Unknown", subscribers: p.count }))
        .sort((a, b) => b.subscribers - a.subscribers),
      revenueSeries: fillSeries(revenueSeriesRows as { _id: Date; value: number }[], since, bucket, until),
    };

    /* ── Creator economy ───────────────────────────────────────────── */

    const funnelByStatus = Object.fromEntries(
      (applicationFunnelRows as { _id: string; count: number }[]).map((r) => [r._id, r.count])
    );
    const approved = funnelByStatus.approved ?? 0;
    const rejected = funnelByStatus.rejected ?? 0;

    let topEarners: { creatorId: string; name: string; netAmount: number }[] = [];
    let payoutStatusBreakdown: { status: string; count: number; netAmount: number }[] = [];
    let earningsPeriod: string | null = null;

    if (latestPeriod) {
      earningsPeriod = latestPeriod.billingPeriod as string;

      const [topEarningsRows, payoutRows] = await Promise.all([
        db.collection("creator_earnings")
          .find({ billingPeriod: earningsPeriod })
          .sort({ netAmount: -1 })
          .limit(5)
          .toArray(),
        db.collection("creator_earnings")
          .aggregate([
            { $match: { billingPeriod: earningsPeriod } },
            { $group: { _id: "$payoutStatus", count: { $sum: 1 }, netAmount: { $sum: "$netAmount" } } },
          ])
          .toArray(),
      ]);

      const creatorIds = topEarningsRows.map((r) => r.creatorId);
      const creators = creatorIds.length
        ? await db.collection("user").find({ _id: { $in: creatorIds } }, { projection: { name: 1 } }).toArray()
        : [];
      const nameById = new Map(creators.map((c) => [String(c._id), c.name as string]));

      topEarners = topEarningsRows.map((r) => ({
        creatorId: String(r.creatorId),
        name:      nameById.get(String(r.creatorId)) ?? "Unknown",
        netAmount: r.netAmount as number,
      }));

      payoutStatusBreakdown = (payoutRows as { _id: string; count: number; netAmount: number }[]).map((r) => ({
        status:    r._id,
        count:     r.count,
        netAmount: r.netAmount,
      }));
    }

    const creatorEconomy = {
      totalCreators,
      applicationsInRange: (applicationFunnelRows as { _id: string; count: number }[]).reduce((a, r) => a + r.count, 0),
      approvalRatePct: approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 1000) / 10 : null,
      earningsPeriod,
      topEarners,
      payoutStatusBreakdown,
    };

    /* ── Content ──────────────────────────────────────────────────────── */

    const content = {
      accessMix: (accessMixRows as { _id: string; count: number }[]).map((r) => ({ access: r._id, count: r.count })),
      topTopics: (topTopicsRows as { _id: string; postsCount: number; totalViews: number; totalLikes: number }[]).map((r) => ({
        topic:      r._id,
        postsCount: r.postsCount,
        totalViews: r.totalViews,
        totalLikes: r.totalLikes,
      })),
    };

    /* ── Moderation ─────────────────────────────────────────────────── */

    const moderation = { pendingReports, bannedUsers };

    /* ── Retention ──────────────────────────────────────────────────── */

    const retention = {
      windowDays: 30,
      cohorts: (cohortRows as { cohortMonth: Date; cohortSize: number; activeCount: number }[]).map((c) => ({
        cohortMonth: new Date(c.cohortMonth).toISOString().slice(0, 7),
        cohortSize:  c.cohortSize,
        activeCount: c.activeCount,
        retentionPct: c.cohortSize > 0 ? Math.round((c.activeCount / c.cohortSize) * 1000) / 10 : 0,
      })),
    };

    return NextResponse.json({
      range,
      growth,
      engagement,
      revenue,
      creatorEconomy,
      content,
      moderation,
      retention,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/analytics/overview] failed:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}

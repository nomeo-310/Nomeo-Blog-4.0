// app/api/admin/overview/route.ts  (admin dashboard)
import { NextResponse }              from "next/server";
import { connectDB }                 from "@/lib/connect-to-database";
import mongoose                      from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/** % change from `previous` to `current`, rounded to one decimal. Null when there's nothing to compare against. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Sums `field` across a collection for documents matching `match`. */
async function sumField(
  db: mongoose.mongo.Db,
  collection: string,
  match: Record<string, unknown>,
  field: string
): Promise<number> {
  const [row] = await db
    .collection(collection)
    .aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
    .toArray();
  return row?.total ?? 0;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Like-for-like cutoff in the previous month (e.g. "up to the 14th"), clamped
    // so day-31 comparisons against a 28/30-day month don't roll into the next one.
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const prevMonthCutoff = new Date(prevMonthStart);
    prevMonthCutoff.setDate(Math.min(now.getDate(), daysInPrevMonth));
    prevMonthCutoff.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

    const nonAdminRoles = { role: { $nin: ["admin", "super_admin", "support"] } };

    const [
      totalUsers,
      newUsersToday,
      newUsersYesterday,
      totalCreators,
      totalPosts,
      postsPublishedToday,
      revenueThisMonth,
      revenueSamePeriodLastMonth,
      activeSubscriptions,
      newSubscriptionsThisMonth,
      pendingApplications,
      bannedUsers,
      pendingPostReports,
      pendingCommentReports,
      pendingLoungeMessageReports,
      unresolvedErrors,
      recentActivityDocs,
    ] = await Promise.all([
      db.collection("user").countDocuments(nonAdminRoles),
      db.collection("user").countDocuments({ ...nonAdminRoles, createdAt: { $gte: todayStart } }),
      db.collection("user").countDocuments({ ...nonAdminRoles, createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      db.collection("user").countDocuments({ role: "creator" }),

      db.collection("posts").countDocuments({ status: "published", isRemoved: { $ne: true } }),
      db.collection("posts").countDocuments({ status: "published", isRemoved: { $ne: true }, publishedAt: { $gte: todayStart } }),

      sumField(db, "payments", { gatewayStatus: "success", createdAt: { $gte: monthStart } }, "amountPaid"),
      sumField(db, "payments", { gatewayStatus: "success", createdAt: { $gte: prevMonthStart, $lt: prevMonthCutoff } }, "amountPaid"),

      db.collection("subscriptions").countDocuments({ status: "active" }),
      db.collection("subscriptions").countDocuments({ createdAt: { $gte: monthStart } }),

      db.collection("creator_applications").countDocuments({ status: "pending" }),
      db.collection("profiles").countDocuments({ banStatus: "banned" }),

      sumField(db, "posts", { pendingReportsCount: { $gt: 0 } }, "pendingReportsCount"),
      sumField(db, "comments", { pendingReportsCount: { $gt: 0 } }, "pendingReportsCount"),
      sumField(db, "lounge_messages", { pendingReportsCount: { $gt: 0 } }, "pendingReportsCount"),

      db.collection("error_logs").countDocuments({ isResolved: false, severity: { $in: ["critical", "error"] } }),

      db.collection("audit_logs")
        .find({}, { projection: { summary: 1, action: 1, actorRole: 1, targetType: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),
    ]);

    const pendingReports = pendingPostReports + pendingCommentReports + pendingLoungeMessageReports;

    return NextResponse.json({
      totalUsers,
      newUsersToday,
      userGrowthPct: pctChange(newUsersToday, newUsersYesterday),

      totalCreators,

      totalPosts,
      postsPublishedToday,

      revenueThisMonth,
      revenueGrowthPct: pctChange(revenueThisMonth, revenueSamePeriodLastMonth),

      activeSubscriptions,
      newSubscriptionsThisMonth,

      pendingApplications,
      bannedUsers,
      pendingReports,
      unresolvedErrors,

      recentActivity: recentActivityDocs.map((doc) => ({
        id: String(doc._id),
        summary: doc.summary as string,
        action: doc.action as string,
        actorRole: doc.actorRole as string,
        targetType: doc.targetType as string | undefined,
        createdAt: doc.createdAt as Date,
      })),

      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[admin/overview] failed to load overview stats:", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}

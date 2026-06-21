import { Metadata } from "next"
import Link from "next/link";
import mongoose from "mongoose";
import {
  FileText, Users, DollarSign, MessageSquare,
  TrendingUp, Eye, Heart, Bookmark, ArrowRight, PenLine,
} from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/features/dashboard-layout";


export const metadata: Metadata = {
  title: 'Overview',
}

/**
 * Dashboard Overview — Nomeo.
 * Shows role-aware stats: everyone sees their personal activity;
 * creators additionally see their content metrics.
 * Route: app/dashboard/page.tsx
 */

type Stats = {
  // shared
  savedCount: number;
  likedCount: number;
  connectionsCount: number;
  // creator only
  postsCount: number;
  totalViews: number;
  followersCount: number;
  totalEarningsKobo: number;
  loungeRequestsCount: number;
  lounges: number;
};

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const isCreator = user.role === "creator";
  const stats = await getStats(user.id, isCreator);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Welcome */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCreator
              ? "Here's how your content is doing."
              : "Here's your reading activity at a glance."}
          </p>
        </div>

        {/* Creator stats */}
        {isCreator && (
          <>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              <StatCard icon={<FileText className="h-5 w-5" />} label="Published posts" value={stats.postsCount} href="/dashboard/posts" />
              <StatCard icon={<Eye className="h-5 w-5" />} label="Total views" value={formatCount(stats.totalViews)} />
              <StatCard icon={<Users className="h-5 w-5" />} label="Followers" value={formatCount(stats.followersCount)} href="/dashboard/subscribers" />
              <StatCard icon={<DollarSign className="h-5 w-5" />} label="Earnings (NGN)" value={formatMoney(stats.totalEarningsKobo)} href="/dashboard/earnings" />
            </div>

            {stats.loungeRequestsCount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {stats.loungeRequestsCount} pending lounge {stats.loungeRequestsCount === 1 ? "request" : "requests"}
                    </p>
                    <p className="text-xs text-muted-foreground">People waiting to join your lounge</p>
                  </div>
                </div>
                <Link href="/dashboard/lounges" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Review <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/posts/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <PenLine className="h-4 w-4" /> Write a new post
              </Link>
              { stats.lounges < 1 &&
                <Link
                  href="/dashboard/lounges/new"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <MessageSquare className="h-4 w-4" /> Create a lounge
                </Link>
              }
            </div>
          </>
        )}

        {/* Shared personal activity */}
        <div>
          <h3 className="mb-4 font-heading text-base font-bold text-foreground">Your activity</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            <StatCard icon={<Bookmark className="h-5 w-5" />} label="Saved posts" value={stats.savedCount} href="/dashboard/saved" />
            <StatCard icon={<Heart className="h-5 w-5" />} label="Liked posts" value={stats.likedCount} href="/dashboard/liked" />
            <StatCard icon={<Users className="h-5 w-5" />} label="Connections" value={stats.connectionsCount} href="/dashboard/connections" />
          </div>
        </div>

        {/* Upgrade CTA for readers */}
        {!isCreator && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">Become a creator</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Publish your writing, build an audience, run a members-only lounge, and earn from your work.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Upgrade your account <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getStats(userId: string, isCreator: boolean): Promise<Stats> {
  const empty: Stats = { savedCount: 0, likedCount: 0, connectionsCount: 0, postsCount: 0, totalViews: 0, followersCount: 0, totalEarningsKobo: 0, loungeRequestsCount: 0, lounges: 0 };
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return empty;
    const uid = new mongoose.Types.ObjectId(userId);

    const sharedQueries = [
      db.collection("saved_posts").countDocuments({ userId: uid }),
      db.collection("reactions").countDocuments({ userId: uid, targetType: "post" }),
      db.collection("followings").countDocuments({ $or: [{ followerId: uid }, { followingId: uid }], isActive: true }),
    ];

    const creatorQueries = isCreator ? [
      db.collection("posts").aggregate([
        { $match: { authorId: uid, status: "published", isRemoved: { $ne: true } } },
        { $group: { _id: null, count: { $sum: 1 }, totalViews: { $sum: "$viewsCount" } } },
      ]).toArray(),
      db.collection("profiles").findOne({ userId: uid }, { projection: { followersCount: 1 } }),
      db.collection("creator_earnings").aggregate([
        { $match: { creatorId: uid } },
        { $group: { _id: null, total: { $sum: "$netPayoutKobo" } } },
      ]).toArray(),
      db.collection("lounge_join_requests").countDocuments({ creatorId: uid, status: "pending" }),
      db.collection("lounges").countDocuments({creatorId: uid, kind: 'creator'})
    ] : [];

    const results = await Promise.all([...sharedQueries, ...creatorQueries]);
    const [savedCount, likedCount, connectionsCount] = results as [number, number, number, ...any[]];

    let postsCount = 0, totalViews = 0, followersCount = 0, totalEarningsKobo = 0, loungeRequestsCount = 0, lounges = 0;
    if (isCreator) {
      const postAgg = results[3] as any[];
      postsCount = postAgg[0]?.count ?? 0;
      totalViews = postAgg[0]?.totalViews ?? 0;
      const profile = results[4] as any;
      followersCount = profile?.followersCount ?? 0;
      const earningsAgg = results[5] as any[];
      totalEarningsKobo = earningsAgg[0]?.total ?? 0;
      loungeRequestsCount = results[6] as number;
      lounges = results[7] as number;
    }

    return { savedCount, likedCount, connectionsCount, postsCount, totalViews, followersCount, totalEarningsKobo, loungeRequestsCount, lounges };
  } catch { return empty; }
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | number; href?: string }) {
  const inner = (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <p className="mt-4 font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function formatMoney(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
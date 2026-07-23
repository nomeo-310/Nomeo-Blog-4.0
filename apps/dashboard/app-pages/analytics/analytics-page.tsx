"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultiple02Icon, PencilEdit02Icon, Files02Icon,
  CreditCardAcceptIcon, TradeUpIcon, Clock03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useAnalyticsOverview } from "./use-analytics-overview";
import { DateRangePicker }     from "./components/date-range-picker";
import { MetricCard, MetricCardSkeleton } from "./components/metric-card";
import { TimeSeriesChart }     from "./components/time-series-chart";
import { RankedBarList }       from "./components/ranked-bar-list";
import { StatusBreakdown }     from "./components/status-breakdown";
import { CohortRetentionTable } from "./components/cohort-retention-table";
import { PostsLeaderboard }    from "./components/posts-leaderboard";
import { PostDetailModal }     from "./components/post-detail-modal";
import {
  formatKobo, formatCompactNumber, formatSecondsAsDuration, titleCase,
} from "./utils";
import type { DateWindow } from "./types";

function Section({
  title, subtitle, children, className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateWindow, setDateWindow] = useState<DateWindow>({ preset: "30d" });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useAnalyticsOverview(dateWindow);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Growth, engagement, and revenue signals for the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateWindow} onChange={setDateWindow} />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Growth */}
      <Section title="Growth" subtitle="New accounts and platform reach">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Total users" value={formatCompactNumber(data.growth.totalUsers)}
                sub={`+${data.growth.newUsersInRange} in range`} growthPct={data.growth.growthPct}
                icon={<HugeiconsIcon icon={UserMultiple02Icon} className="h-4.5 w-4.5" />}
              />
              <MetricCard
                label="Creators" value={formatCompactNumber(data.growth.totalCreators)}
                sub={`${data.growth.creatorConversionPct}% of all users`}
                icon={<HugeiconsIcon icon={PencilEdit02Icon} className="h-4.5 w-4.5" />}
              />
              <MetricCard
                label="Onboarding completion" value={`${data.growth.onboardingCompletionPct}%`}
                sub="Completed profile setup"
              />
              <MetricCard
                label="New signups" value={formatCompactNumber(data.growth.newUsersInRange)}
                growthPct={data.growth.growthPct} sub="vs. previous period"
              />
            </>
          )}
        </div>
        {data && (
          <div className="mt-4">
            <TimeSeriesChart data={data.growth.signupSeries} valueFormatter={(v) => `${v} signups`} />
          </div>
        )}
      </Section>

      {/* Engagement */}
      <Section title="Engagement" subtitle="How much people read, and how deeply">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Active readers" value={formatCompactNumber(data.engagement.activeReaders)}
                sub="Read ≥1 post in range"
              />
              <MetricCard
                label="Posts published" value={formatCompactNumber(data.engagement.postsPublishedInRange)}
                growthPct={data.engagement.postsGrowthPct}
                icon={<HugeiconsIcon icon={Files02Icon} className="h-4.5 w-4.5" />}
              />
              <MetricCard
                label="Read completion rate" value={`${data.engagement.completionRatePct}%`}
                sub={`${data.engagement.subscriberReadSharePct}% by subscribers`}
              />
              <MetricCard
                label="Avg. read duration" value={formatSecondsAsDuration(data.engagement.avgReadDurationSecs)}
                icon={<HugeiconsIcon icon={Clock03Icon} className="h-4.5 w-4.5" />}
              />
            </>
          )}
        </div>
        {data && (
          <div className="mt-4">
            <TimeSeriesChart data={data.engagement.readSeries} valueFormatter={(v) => `${v} reads`} />
          </div>
        )}
      </Section>

      {/* Revenue */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Revenue" subtitle="MRR, ARPU, and subscription health" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              <>
                <MetricCard
                  label="MRR" value={formatKobo(data.revenue.mrr)}
                  icon={<HugeiconsIcon icon={CreditCardAcceptIcon} className="h-4.5 w-4.5" />}
                />
                <MetricCard label="ARPU" value={formatKobo(data.revenue.arpu)} />
                <MetricCard
                  label="Active subscriptions" value={formatCompactNumber(data.revenue.activeSubscriptions)}
                  icon={<HugeiconsIcon icon={TradeUpIcon} className="h-4.5 w-4.5" />}
                />
                <MetricCard
                  label="Revenue this period" value={formatKobo(data.revenue.revenueInRange)}
                  growthPct={data.revenue.revenueGrowthPct}
                />
              </>
            )}
          </div>
          {data && (
            <div className="mt-4">
              <TimeSeriesChart data={data.revenue.revenueSeries} valueFormatter={(v) => formatKobo(v)} />
            </div>
          )}
          {data && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <p className="font-heading text-lg font-bold text-foreground">{data.revenue.churnRatePct}%</p>
                <p className="text-xs text-muted-foreground">Churn rate (approx.)</p>
              </div>
              <div>
                <p className="font-heading text-lg font-bold text-foreground">{data.revenue.cancelledInRange}</p>
                <p className="text-xs text-muted-foreground">Cancellations in range</p>
              </div>
              <div>
                <p className="font-heading text-lg font-bold text-foreground">{data.revenue.paymentSuccessRatePct}%</p>
                <p className="text-xs text-muted-foreground">Payment success rate</p>
              </div>
            </div>
          )}
        </Section>

        <Section title="Plans" subtitle="Active subscribers by plan">
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
            </div>
          ) : (
            <RankedBarList
              emptyLabel="No active subscriptions."
              items={data.revenue.planBreakdown.map((p) => ({
                key: p.planId, label: p.planName, value: p.subscribers,
              }))}
            />
          )}
        </Section>
      </div>

      {/* Creator economy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Top earning creators"
          subtitle={data?.creatorEconomy.earningsPeriod ? `Billing period ${data.creatorEconomy.earningsPeriod}` : "No closed billing period yet"}
        >
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
            </div>
          ) : (
            <RankedBarList
              emptyLabel="No earnings recorded for this period."
              items={data.creatorEconomy.topEarners.map((e) => ({
                key: e.creatorId, label: e.name, value: e.netAmount, formattedValue: formatKobo(e.netAmount),
              }))}
            />
          )}
        </Section>

        <Section title="Creator payouts" subtitle="Payout status for the latest period">
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
            </div>
          ) : (
            <StatusBreakdown rows={data.creatorEconomy.payoutStatusBreakdown} />
          )}
        </Section>
      </div>

      {/* Applications + content mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Creator applications" className="lg:col-span-1">
          {isLoading || !data ? (
            <MetricCardSkeleton />
          ) : (
            <div className="space-y-4">
              <MetricCard
                label="Applications in range" value={data.creatorEconomy.applicationsInRange}
              />
              <div>
                <p className="font-heading text-lg font-bold text-foreground">
                  {data.creatorEconomy.approvalRatePct !== null ? `${data.creatorEconomy.approvalRatePct}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Approval rate</p>
              </div>
            </div>
          )}
        </Section>

        <Section title="Top topics" subtitle="Most-published topics in range" className="lg:col-span-2">
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)}
            </div>
          ) : (
            <RankedBarList
              emptyLabel="No published posts in this range."
              items={data.content.topTopics.map((t) => ({
                key: t.topic, label: `#${t.topic}`, value: t.postsCount, formattedValue: `${t.postsCount} posts`,
              }))}
            />
          )}
        </Section>
      </div>

      {/* Access mix + moderation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Free vs. paid content">
          {isLoading || !data ? (
            <MetricCardSkeleton />
          ) : (
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {data.content.accessMix.map((row, i) => {
                const total = data.content.accessMix.reduce((a, r) => a + r.count, 0) || 1;
                return (
                  <div
                    key={row.access}
                    className={cn("h-full", i === 0 ? "bg-primary" : "bg-muted-foreground/40")}
                    style={{ width: `${(row.count / total) * 100}%` }}
                  />
                );
              })}
            </div>
          )}
          {data && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {data.content.accessMix.map((row) => (
                <span key={row.access} className="flex items-center gap-1.5">
                  <span className="capitalize text-foreground">{titleCase(row.access)}</span>
                  <span className="text-muted-foreground">{row.count} posts</span>
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Moderation" subtitle="Trust & safety at a glance">
          {isLoading || !data ? (
            <MetricCardSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Open reports" value={data.moderation.pendingReports} />
              <MetricCard label="Banned users" value={data.moderation.bannedUsers} />
            </div>
          )}
        </Section>
      </div>

      {/* Retention */}
      <Section title="Retention" subtitle={`% of each signup cohort active in the last ${data?.retention.windowDays ?? 30} days`}>
        {isLoading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <CohortRetentionTable cohorts={data.retention.cohorts} windowDays={data.retention.windowDays} />
        )}
      </Section>

      {/* Content performance leaderboard */}
      <PostsLeaderboard onSelectPost={setSelectedPostId} />

      <PostDetailModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
    </div>
  );
}

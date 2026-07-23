"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultiple02Icon,
  Files02Icon,
  CreditCardAcceptIcon,
  TradeUpIcon,
  Clock03Icon,
  UnavailableIcon,
  PencilEdit02Icon,
  FlagIcon,
} from "@hugeicons/core-free-icons";
import { StatCard }         from "./stat-card";
import { StatCardSkeleton } from "./stat-card-skeleton";
import { formatKobo }       from "../utils";
import type { OverviewData } from "../types";

export function StatsGrid({ data, isLoading }: { data?: OverviewData; isLoading: boolean }) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
      ) : (
        <>
          <StatCard
            label="Total users"
            value={data?.totalUsers}
            sub={`+${data?.newUsersToday ?? 0} today`}
            growthPct={data?.userGrowthPct ?? null}
            icon={<HugeiconsIcon icon={UserMultiple02Icon} className="h-5 w-5" />}
            href="/dashboard/users"
          />
          <StatCard
            label="Creators"
            value={data?.totalCreators}
            icon={<HugeiconsIcon icon={PencilEdit02Icon} className="h-5 w-5" />}
            href="/dashboard/users?filter=creators"
          />
          <StatCard
            label="Posts published"
            value={data?.totalPosts}
            sub={`+${data?.postsPublishedToday ?? 0} today`}
            icon={<HugeiconsIcon icon={Files02Icon} className="h-5 w-5" />}
            href="/dashboard/posts"
          />
          <StatCard
            label="Revenue this month"
            value={data ? formatKobo(data.revenueThisMonth) : "—"}
            sub="Successful payments"
            growthPct={data?.revenueGrowthPct ?? null}
            icon={<HugeiconsIcon icon={CreditCardAcceptIcon} className="h-5 w-5" />}
            href="/dashboard/payments"
          />
          <StatCard
            label="Active subscriptions"
            value={data?.activeSubscriptions}
            sub={`+${data?.newSubscriptionsThisMonth ?? 0} this month`}
            icon={<HugeiconsIcon icon={TradeUpIcon} className="h-5 w-5" />}
            href="/dashboard/subscriptions"
          />
          <StatCard
            label="Pending applications"
            value={data?.pendingApplications}
            icon={<HugeiconsIcon icon={Clock03Icon} className="h-5 w-5" />}
            href="/dashboard/applicants"
            alert={(data?.pendingApplications ?? 0) > 0}
          />
          <StatCard
            label="Open reports"
            value={data?.pendingReports}
            icon={<HugeiconsIcon icon={FlagIcon} className="h-5 w-5" />}
            href="/dashboard/moderation"
            alert={(data?.pendingReports ?? 0) > 0}
          />
          <StatCard
            label="Banned users"
            value={data?.bannedUsers}
            icon={<HugeiconsIcon icon={UnavailableIcon} className="h-5 w-5" />}
            href="/dashboard/users?filter=banned"
            danger={(data?.bannedUsers ?? 0) > 0}
          />
        </>
      )}
    </div>
  );
}

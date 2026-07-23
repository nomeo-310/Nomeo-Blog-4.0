"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { TickDouble02Icon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { NotificationItem } from "./notifications-item";
import { NotificationFilterTabs } from "./notifications-filter-tabs";
import { NotificationsEmptyState } from "./notifications-empty-state";
import type { Notification } from "./notifications-types";

/**
 * Notifications page — the full archive, reachable via "See all notifications"
 * from the activity panel slider. Genuinely different from the slider:
 *   • Full history (not capped at 20)
 *   • Filterable by notification type group
 *   • Pagination
 *
 * The slider stays the quick-glance surface; this page is the complete record.
 *
 * Layout is composed from sibling sub-components in this same folder
 * (notifications-item, notifications-filter-tabs, notifications-empty-state);
 * this file owns the data layer and top-level composition only.
 *
 * Route: app/dashboard/notifications/page.tsx
 */

// Group the many notification types into a few readable filter tabs.
const FILTER_GROUPS = [
  { key: "all",          label: "All" },
  { key: "social",       label: "Social",       types: ["follow_request_received","follow_request_accepted","follow_request_declined","new_follower"] },
  { key: "content",      label: "Content",      types: ["new_post","post_liked","post_saved","post_featured","post_removed","new_comment","comment_reply","comment_liked","comment_removed","coauthor_invited","coauthor_accepted","coauthor_declined"] },
  { key: "lounges",      label: "Lounges",      types: ["lounge_join_request","lounge_join_accepted","lounge_join_declined","lounge_message","lounge_mention","lounge_suspended"] },
  { key: "earnings",     label: "Earnings",     types: ["subscription_started","subscription_renewed","subscription_expiring_soon","subscription_cancelled","subscription_failed","payout_processed","earnings_milestone","creator_upgrade_successful"] },
  { key: "system",       label: "System",       types: ["system_announcement","free_reads_low","free_reads_exhausted","report_filed","report_escalated","account_warned","account_banned","account_unbanned"] },
] as const;

type FilterKey = typeof FILTER_GROUPS[number]["key"];

const PAGE_SIZE = 30;

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-full", filter, page],
    queryFn: async () => {
      const sp = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      const group = FILTER_GROUPS.find((g) => g.key === filter);
      if (group && "types" in group) sp.set("types", group.types.join(","));
      const { data } = await api.get<{ notifications: Notification[]; unreadCount: number; total: number }>(`/api/notifications?${sp.toString()}`);
      return data;
    },
    staleTime: 30_000,
  });

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async (ids: string[]) => {
    await api.post("/api/notifications/read", { ids });
    qc.invalidateQueries({ queryKey: ["notifications-full"] });
    qc.invalidateQueries({ queryKey: ["activity-count"] });
  };

  const markAllRead = async () => {
    try {
      await api.post("/api/notifications/read", { all: true });
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
      qc.invalidateQueries({ queryKey: ["activity-count"] });
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Couldn't mark all read. Try again.");
    }
  };

  const onFilterChange = (key: FilterKey) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} total` : "Your full notification history"}
            {unread > 0 && ` · ${unread} unread on this page`}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={TickDouble02Icon} className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <NotificationFilterTabs
        groups={FILTER_GROUPS}
        active={filter}
        onChange={(key) => onFilterChange(key as FilterKey)}
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <NotificationsEmptyState
          isFiltered={filter !== "all"}
          filterLabel={FILTER_GROUPS.find((g) => g.key === filter)?.label}
          onShowAll={() => onFilterChange("all")}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={() => markRead([n.id])} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border px-4 py-2 font-medium text-foreground hover:bg-accent disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border px-4 py-2 font-medium text-foreground hover:bg-accent disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

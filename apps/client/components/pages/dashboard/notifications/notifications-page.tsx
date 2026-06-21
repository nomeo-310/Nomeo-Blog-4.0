"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

/**
 * Notifications page — the full archive, reachable via "See all notifications"
 * from the activity panel slider. Genuinely different from the slider:
 *   • Full history (not capped at 20)
 *   • Filterable by notification type group
 *   • Pagination
 *
 * The slider stays the quick-glance surface; this page is the complete record.
 * Route: app/dashboard/notifications/page.tsx
 */

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
};

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
    <div className="max-w-4xl space-y-6">
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
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="flex gap-1 pl-1">
          {FILTER_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => onFilterChange(g.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === g.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30" />
          <h3 className="mt-4 font-heading text-base font-bold text-foreground">
            {filter === "all" ? "No notifications yet" : `No ${FILTER_GROUPS.find((g) => g.key === filter)?.label.toLowerCase()} notifications`}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "all" ? "Activity on your account will appear here." : "Try a different filter."}
          </p>
          {filter !== "all" && (
            <button onClick={() => onFilterChange("all")} className="mt-4 text-sm font-semibold text-primary hover:underline">
              Show all
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-5 py-4 transition-colors",
                  !n.isRead && "bg-primary/[0.03]"
                )}
              >
                {/* Unread dot */}
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", !n.isRead ? "bg-primary" : "bg-transparent")} />

                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-snug", n.isRead ? "text-muted-foreground" : "font-medium text-foreground")}>
                    {n.message}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">{n.type.replace(/_/g, " ")}</span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => markRead([n.id])}
                    title="Mark as read"
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
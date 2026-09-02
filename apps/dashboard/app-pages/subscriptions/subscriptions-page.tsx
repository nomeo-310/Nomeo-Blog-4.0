"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { useSubscriptionsList } from "./use-subscriptions-list";
import { useBulkCancelSubscriptions } from "./use-subscription-mutations";
import { SubscriptionsFilterBar } from "./components/subscriptions-filter-bar";
import { SubscriptionsTable }     from "./components/subscriptions-table";
import { SubscriptionDetailModal } from "./components/subscription-detail-modal";
import type { SubscriptionStatusFilter, SubscriptionSortBy } from "./types";

export default function SubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatusFilter>("all");
  const [sortBy, setSortBy] = useState<SubscriptionSortBy>("newest");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Matches the PATCH route's gate — cancelling a paid subscription is
  // financially significant, so it's admin/super_admin only.
  const canCancel = role === "admin" || role === "super_admin";

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useSubscriptionsList({ status, search, sortBy, page, limit: 20 });
  const bulkCancel = useBulkCancelSubscriptions(bulk.clear);

  const cancellableCount = (data?.subscriptions ?? []).filter((s) => s.status !== "cancelled").length;
  const canBulkSelect = canCancel && cancellableCount > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Every platform membership subscription.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      <SubscriptionsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); bulk.clear(); }}
        sortBy={sortBy} onSortByChange={setSortBy}
      />

      {canBulkSelect && (
        <BulkActionBar count={bulk.count} onClear={bulk.clear}>
          <ReasonActionButton
            label="Cancel" variant="destructive" isLoading={bulkCancel.isPending}
            onConfirm={(reason) => bulkCancel.mutate({ ids: bulk.ids, reason: reason! })}
          />
        </BulkActionBar>
      )}

      <div className="rounded-2xl border border-border bg-card">
        <SubscriptionsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selectable={canBulkSelect}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onSelectSubscription={setSelectedSubscriptionId}
          onPageChange={setPage}
        />
      </div>

      <SubscriptionDetailModal subscriptionId={selectedSubscriptionId} onClose={() => setSelectedSubscriptionId(null)} />
    </div>
  );
}

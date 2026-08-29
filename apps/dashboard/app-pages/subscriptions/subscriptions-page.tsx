"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionsList } from "./use-subscriptions-list";
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

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useSubscriptionsList({ status, search, sortBy, page, limit: 20 });

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
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        sortBy={sortBy} onSortByChange={setSortBy}
      />

      <div className="rounded-2xl border border-border bg-card">
        <SubscriptionsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectSubscription={setSelectedSubscriptionId}
          onPageChange={setPage}
        />
      </div>

      <SubscriptionDetailModal subscriptionId={selectedSubscriptionId} onClose={() => setSelectedSubscriptionId(null)} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { useFollowersList } from "./use-followers-list";
import { useBulkDeactivateFollows } from "./use-follower-mutations";
import { FollowersFilterBar } from "./components/followers-filter-bar";
import { FollowersTable }     from "./components/followers-table";
import type { FollowerStatusFilter, FollowerSortBy } from "./types";

export default function FollowersPage() {
  const [status, setStatus]       = useState<FollowerStatusFilter>("active");
  const [sortBy, setSortBy]       = useState<FollowerSortBy>("newest");
  const [page, setPage]           = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useFollowersList({ status, search, sortBy, page, limit: 20 });
  const bulkDeactivate = useBulkDeactivateFollows(bulk.clear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Followers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Every follow relationship on the platform.</p>
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

      <FollowersFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); bulk.clear(); }}
        sortBy={sortBy} onSortByChange={setSortBy}
      />

      <BulkActionBar count={bulk.count} onClear={bulk.clear}>
        <ReasonActionButton
          label="Deactivate selected" variant="destructive" requireReason={false}
          isLoading={bulkDeactivate.isPending}
          onConfirm={(reason) => bulkDeactivate.mutate({ ids: bulk.ids, reason })}
        />
      </BulkActionBar>

      <div className="rounded-2xl border border-border bg-card">
        <FollowersTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

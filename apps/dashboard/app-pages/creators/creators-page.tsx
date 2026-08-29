"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { useCreatorsList } from "./use-creators-list";
import { useBulkCreatorAction } from "./use-creator-mutations";
import { CreatorsFilterBar } from "./components/creators-filter-bar";
import { CreatorsTable }     from "./components/creators-table";
import { CreatorDetailModal } from "./components/creator-detail-modal";
import type { CreatorStatusFilter, CreatorSortBy } from "./types";

export default function CreatorsPage() {
  const [creatorStatus, setCreatorStatus] = useState<CreatorStatusFilter>("all");
  const [sortBy, setSortBy]       = useState<CreatorSortBy>("newest");
  const [page, setPage]           = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canModerate = role === "admin" || role === "super_admin";

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useCreatorsList({
    creatorStatus, search, sortBy, page, limit: 20,
  });
  const bulkAction = useBulkCreatorAction(bulk.clear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Creators</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage creator standing and review their earnings and payouts.</p>
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

      {/* Filters */}
      <CreatorsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        creatorStatus={creatorStatus} onCreatorStatusChange={(v) => { setCreatorStatus(v); setPage(1); bulk.clear(); }}
        sortBy={sortBy} onSortByChange={(v) => { setSortBy(v); setPage(1); }}
      />

      {canModerate && (
        <BulkActionBar count={bulk.count} onClear={bulk.clear}>
          <ReasonActionButton
            label="Reinstate" requireReason={false} isLoading={bulkAction.isPending}
            onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "reinstate", reason })}
          />
          <ReasonActionButton
            label="Suspend" variant="destructive" isLoading={bulkAction.isPending}
            onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "suspend", reason })}
          />
          <ReasonActionButton
            label="Demote to user" variant="destructive" isLoading={bulkAction.isPending}
            onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "demote", reason })}
          />
        </BulkActionBar>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <CreatorsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onSelectCreator={setSelectedCreatorId}
          onPageChange={setPage}
        />
      </div>

      <CreatorDetailModal creatorId={selectedCreatorId} onClose={() => setSelectedCreatorId(null)} />
    </div>
  );
}

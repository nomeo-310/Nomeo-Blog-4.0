"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLoungesList } from "./use-lounges-list";
import { LoungesFilterBar } from "./components/lounges-filter-bar";
import { LoungesTable }     from "./components/lounges-table";
import { LoungeDetailModal } from "./components/lounge-detail-modal";
import { CreateLoungeModal } from "./components/create-lounge-modal";
import type {
  LoungeAccessTypeFilter, LoungeKindFilter, LoungeSortBy, LoungeStatusFilter,
} from "./types";

export default function LoungesPage() {
  const [kind, setKind]       = useState<LoungeKindFilter>("all");
  const [status, setStatus]   = useState<LoungeStatusFilter>("all");
  const [accessType, setAccessType] = useState<LoungeAccessTypeFilter>("all");
  const [hasOpenReports, setHasOpenReports] = useState(false);
  const [sortBy, setSortBy]   = useState<LoungeSortBy>("newest");
  const [page, setPage]       = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");
  const [selectedLoungeId, setSelectedLoungeId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useLoungesList({
    kind, status, accessType, hasOpenReports, search, sortBy, page, limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Lounges</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review, moderate, and manage every lounge on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
          <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)} className={'rounded-full'}>
            <Plus className="h-3.5 w-3.5" />
            Create lounge
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LoungesFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        kind={kind} onKindChange={(v) => { setKind(v); setPage(1); }}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        accessType={accessType} onAccessTypeChange={(v) => { setAccessType(v); setPage(1); }}
        hasOpenReports={hasOpenReports} onHasOpenReportsChange={(v) => { setHasOpenReports(v); setPage(1); }}
        sortBy={sortBy} onSortByChange={(v) => { setSortBy(v); setPage(1); }}
      />

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <LoungesTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectLounge={setSelectedLoungeId}
          onPageChange={setPage}
        />
      </div>

      <LoungeDetailModal loungeId={selectedLoungeId} onClose={() => setSelectedLoungeId(null)} />
      <CreateLoungeModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

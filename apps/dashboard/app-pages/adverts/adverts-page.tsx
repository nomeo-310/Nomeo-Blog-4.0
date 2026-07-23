"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdvertsList } from "./use-adverts-list";
import { AdvertsFilterBar } from "./components/adverts-filter-bar";
import { AdvertsTable }     from "./components/adverts-table";
import { AdvertDetailModal } from "./components/advert-detail-modal";
import { CreateAdvertModal } from "./components/create-advert-modal";
import type {
  AdvertPlacementFilter, AdvertSortBy, AdvertStatusFilter, AdvertTypeFilter,
} from "./types";

export default function AdvertsPage() {
  const [type, setType]           = useState<AdvertTypeFilter>("all");
  const [status, setStatus]       = useState<AdvertStatusFilter>("all");
  const [placement, setPlacement] = useState<AdvertPlacementFilter>("all");
  const [sortBy, setSortBy]       = useState<AdvertSortBy>("newest");
  const [page, setPage]           = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [selectedAdvertId, setSelectedAdvertId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useAdvertsList({
    type, status, placement, search, sortBy, page, limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Adverts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review, moderate, and manage every advert on the platform.</p>
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
          <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full">
            <Plus className="h-3.5 w-3.5" />
            Create advert
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AdvertsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        type={type} onTypeChange={(v) => { setType(v); setPage(1); }}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        placement={placement} onPlacementChange={(v) => { setPlacement(v); setPage(1); }}
        sortBy={sortBy} onSortByChange={(v) => { setSortBy(v); setPage(1); }}
      />

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <AdvertsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectAdvert={setSelectedAdvertId}
          onPageChange={setPage}
        />
      </div>

      <AdvertDetailModal advertId={selectedAdvertId} onClose={() => setSelectedAdvertId(null)} />
      <CreateAdvertModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

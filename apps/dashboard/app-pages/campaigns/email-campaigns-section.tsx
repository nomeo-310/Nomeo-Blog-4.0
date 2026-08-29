"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCampaignsList } from "./use-campaigns-list";
import { CampaignsFilterBar } from "./components/campaigns-filter-bar";
import { CampaignsTable }     from "./components/campaigns-table";
import { CreateCampaignModal } from "./components/create-campaign-modal";
import { CampaignDetailModal } from "./components/campaign-detail-modal";
import type { CampaignStatusFilter, CampaignTypeFilter } from "./types";

export function EmailCampaignsSection() {
  const [status, setStatus] = useState<CampaignStatusFilter>("all");
  const [type, setType]     = useState<CampaignTypeFilter>("all");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useCampaignsList({ status, type, search, page, limit: 20 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
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
          New campaign
        </Button>
      </div>

      <CampaignsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        type={type} onTypeChange={(v) => { setType(v); setPage(1); }}
      />

      <div className="rounded-2xl border border-border bg-card">
        <CampaignsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectCampaign={setSelectedCampaignId}
          onPageChange={setPage}
        />
      </div>

      <CampaignDetailModal campaignId={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={(createdId) => { setIsCreateOpen(false); if (createdId) setSelectedCampaignId(createdId); }}
      />
    </div>
  );
}

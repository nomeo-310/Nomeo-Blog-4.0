"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSmsCampaignsList } from "./use-sms-campaigns-list";
import { SmsCampaignsFilterBar } from "./components/sms-campaigns-filter-bar";
import { SmsCampaignsTable }     from "./components/sms-campaigns-table";
import { CreateSmsCampaignModal } from "./components/create-sms-campaign-modal";
import { SmsCampaignDetailModal } from "./components/sms-campaign-detail-modal";
import type { SmsCampaignStatusFilter } from "./types";

export function SmsCampaignsSection() {
  const [status, setStatus] = useState<SmsCampaignStatusFilter>("all");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useSmsCampaignsList({ status, search, page, limit: 20 });

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
          New SMS campaign
        </Button>
      </div>

      <SmsCampaignsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      <div className="rounded-2xl border border-border bg-card">
        <SmsCampaignsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectCampaign={setSelectedCampaignId}
          onPageChange={setPage}
        />
      </div>

      <SmsCampaignDetailModal campaignId={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />
      <CreateSmsCampaignModal
        isOpen={isCreateOpen}
        onClose={(createdId) => { setIsCreateOpen(false); if (createdId) setSelectedCampaignId(createdId); }}
      />
    </div>
  );
}

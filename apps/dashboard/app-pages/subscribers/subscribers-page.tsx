"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { useSubscribersList } from "./use-subscribers-list";
import { useBulkSubscriberAction } from "./use-subscriber-mutations";
import { SubscribersFilterBar } from "./components/subscribers-filter-bar";
import { SubscribersTable }     from "./components/subscribers-table";
import { SubscriberDetailModal } from "./components/subscriber-detail-modal";
import type { SubscriberStatusFilter, SubscriberSourceFilter } from "./types";

export default function SubscribersPage() {
  const [status, setStatus] = useState<SubscriberStatusFilter>("all");
  const [source, setSource] = useState<SubscriberSourceFilter>("all");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useSubscribersList({ status, source, search, page, limit: 20 });
  const bulkAction = useBulkSubscriberAction(bulk.clear);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Subscribers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">The platform newsletter mailing list.</p>
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

      <SubscribersFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); bulk.clear(); }}
        source={source} onSourceChange={(v) => { setSource(v); setPage(1); bulk.clear(); }}
      />

      <BulkActionBar count={bulk.count} onClear={bulk.clear}>
        <ReasonActionButton
          label="Unsubscribe selected" variant="outline" requireReason={false}
          isLoading={bulkAction.isPending}
          onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "unsubscribe", reason })}
        />
        {isSuperAdmin && (
          <ReasonActionButton
            label="Delete selected" variant="destructive"
            isLoading={bulkAction.isPending}
            onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "delete", reason })}
          />
        )}
      </BulkActionBar>

      <div className="rounded-2xl border border-border bg-card">
        <SubscribersTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onSelectSubscriber={setSelectedSubscriberId}
          onPageChange={setPage}
        />
      </div>

      <SubscriberDetailModal subscriberId={selectedSubscriberId} onClose={() => setSelectedSubscriberId(null)} />
    </div>
  );
}

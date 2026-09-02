"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { useErrorLogList } from "./use-error-log-list";
import { useBulkUpdateErrors } from "./use-error-log-mutations";
import { ErrorLogFilterBar } from "./components/error-log-filter-bar";
import { ErrorLogTable }     from "./components/error-log-table";
import { ErrorLogDetailModal } from "./components/error-log-detail-modal";
import type { ErrorSourceFilter, ErrorSeverityFilter, ErrorResolvedFilter } from "./types";

export default function ErrorLogPage() {
  const [source, setSource]     = useState<ErrorSourceFilter>("all");
  const [severity, setSeverity] = useState<ErrorSeverityFilter>("all");
  const [resolved, setResolved] = useState<ErrorResolvedFilter>("unresolved");
  const [page, setPage]         = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]     = useState("");
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useErrorLogList({
    source, severity, resolved, search, page, limit: 25,
  });
  const bulkUpdate = useBulkUpdateErrors(bulk.clear);

  // Only earns its keep with more than one entry to act on at a time —
  // resolving/reopening a single row is already one click on its own row.
  const canBulkSelect = (data?.logs.length ?? 0) > 1;

  const selectedError = data?.logs.find((l) => l.id === selectedErrorId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Error log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Frontend, backend, background job, and webhook errors captured across the platform.
            {typeof data?.unresolvedCount === "number" && (
              <> {data.unresolvedCount} unresolved right now.</>
            )}
          </p>
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

      <ErrorLogFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        source={source} onSourceChange={(v) => { setSource(v); setPage(1); bulk.clear(); }}
        severity={severity} onSeverityChange={(v) => { setSeverity(v); setPage(1); bulk.clear(); }}
        resolved={resolved} onResolvedChange={(v) => { setResolved(v); setPage(1); bulk.clear(); }}
      />

      {canBulkSelect && (
        <BulkActionBar count={bulk.count} onClear={bulk.clear}>
          <Button
            type="button" size="sm" className="rounded-full"
            disabled={bulkUpdate.isPending}
            onClick={() => bulkUpdate.mutate({ ids: bulk.ids, action: "resolve" })}
          >
            Mark resolved
          </Button>
          <Button
            type="button" size="sm" variant="outline" className="rounded-full"
            disabled={bulkUpdate.isPending}
            onClick={() => bulkUpdate.mutate({ ids: bulk.ids, action: "reopen" })}
          >
            Reopen
          </Button>
        </BulkActionBar>
      )}

      <div className="rounded-2xl border border-border bg-card">
        <ErrorLogTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selectable={canBulkSelect}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onSelectError={setSelectedErrorId}
          onPageChange={setPage}
        />
      </div>

      <ErrorLogDetailModal error={selectedError} onClose={() => setSelectedErrorId(null)} />
    </div>
  );
}

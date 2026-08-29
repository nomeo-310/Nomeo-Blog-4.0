"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLogList } from "./use-audit-log-list";
import { AuditLogFilterBar } from "./components/audit-log-filter-bar";
import { AuditLogTable }     from "./components/audit-log-table";
import { AuditLogDetailModal } from "./components/audit-log-detail-modal";
import type {
  AuditCategoryFilter, AuditSeverityFilter, AuditStatusFilter, AuditTargetTypeFilter,
} from "./types";

export default function AuditLogPage() {
  const [category, setCategory]     = useState<AuditCategoryFilter>("all");
  const [severity, setSeverity]     = useState<AuditSeverityFilter>("all");
  const [status, setStatus]         = useState<AuditStatusFilter>("all");
  const [targetType, setTargetType] = useState<AuditTargetTypeFilter>("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [page, setPage]             = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]         = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useAuditLogList({
    category, severity, status, targetType, search, dateFrom, dateTo, page, limit: 25,
  });

  const selectedLog = data?.logs.find((l) => l.id === selectedLogId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Audit log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">A record of every sensitive action taken by admins on this dashboard.</p>
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

      <AuditLogFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        category={category} onCategoryChange={(v) => { setCategory(v); setPage(1); }}
        severity={severity} onSeverityChange={(v) => { setSeverity(v); setPage(1); }}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        targetType={targetType} onTargetTypeChange={(v) => { setTargetType(v); setPage(1); }}
        dateFrom={dateFrom} onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} onDateToChange={(v) => { setDateTo(v); setPage(1); }}
      />

      <div className="rounded-2xl border border-border bg-card">
        <AuditLogTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectLog={setSelectedLogId}
          onPageChange={setPage}
        />
      </div>

      <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLogId(null)} />
    </div>
  );
}

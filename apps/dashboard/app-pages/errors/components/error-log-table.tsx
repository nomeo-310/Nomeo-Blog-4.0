"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { ErrorSeverityBadge, ErrorSourceBadge, ErrorResolvedBadge } from "./error-log-badges";
import { formatDateTime } from "../utils";
import type { ErrorLogListResponse } from "../types";

const COLUMN_COUNT = 7;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-6" },
  { width: "w-56", lines: 2 },
  { width: "w-24" },
  { width: "w-24" },
  { width: "w-16" },
  { width: "w-20" },
  { width: "w-28" },
];

export function ErrorLogTable({
  data, isLoading, isFetching, selectable, selected, onToggle, onToggleAll, onSelectError, onPageChange,
}: {
  data?: ErrorLogListResponse;
  isLoading: boolean;
  isFetching: boolean;
  /** Only offered when there's more than one entry in the current view. */
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onSelectError: (errorId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.logs.length;
  const rowIds = (data?.logs ?? []).map((l) => l.id);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-6">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(rowIds)} disabled={rowIds.length === 0} aria-label="Select all" />
              </TableHead>
            )}
            <TableHead>Error</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Count</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={selectable ? SKELETON_COLUMNS : SKELETON_COLUMNS.slice(1)} rows={10} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={selectable ? COLUMN_COUNT : COLUMN_COUNT - 1} className="py-14 text-center text-sm text-muted-foreground">
                No error log entries match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.logs.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => onSelectError(l.id)}>
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => onToggle(l.id)} aria-label="Select row" />
                  </TableCell>
                )}
                <TableCell className="max-w-80 whitespace-normal">
                  <p className="truncate font-mono text-xs font-medium text-foreground">{l.errorCode}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.message}</p>
                </TableCell>
                <TableCell><ErrorSourceBadge source={l.source} /></TableCell>
                <TableCell><ErrorSeverityBadge severity={l.severity} /></TableCell>
                <TableCell className="text-foreground">{l.occurrenceCount}×</TableCell>
                <TableCell><ErrorResolvedBadge isResolved={l.isResolved} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(l.lastOccurredAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} entries
          </p>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page <= 1} onClick={() => onPageChange(Math.max(1, data.pagination.page - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => onPageChange(data.pagination.page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

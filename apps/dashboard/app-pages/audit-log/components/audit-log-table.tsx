"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { AuditSeverityBadge, AuditStatusBadge } from "./audit-log-badges";
import { formatDateTime, titleCase } from "../utils";
import type { AuditLogListResponse } from "../types";

const COLUMN_COUNT = 6;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-40", lines: 2 },
  { width: "w-32" },
  { width: "w-36" },
  { width: "w-20" },
  { width: "w-20" },
  { width: "w-28" },
];

export function AuditLogTable({
  data, isLoading, isFetching, onSelectLog, onPageChange,
}: {
  data?: AuditLogListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectLog: (logId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.logs.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={10} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No audit log entries match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.logs.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => onSelectLog(l.id)}>
                <TableCell className="max-w-48 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{l.adminName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.adminEmail}</p>
                </TableCell>
                <TableCell className="text-foreground">{titleCase(l.action)}</TableCell>
                <TableCell className="max-w-44 truncate text-muted-foreground">
                  {l.targetType ? `${titleCase(l.targetType)}${l.targetName ? ` · ${l.targetName}` : ""}` : "—"}
                </TableCell>
                <TableCell><AuditSeverityBadge severity={l.severity} /></TableCell>
                <TableCell><AuditStatusBadge status={l.status} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
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

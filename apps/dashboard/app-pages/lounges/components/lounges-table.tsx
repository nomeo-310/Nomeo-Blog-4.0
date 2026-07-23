"use client";

import { ChevronLeft, ChevronRight, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { LoungeStatusBadge, KindBadge, AccessTypeBadge, ReportsBadge } from "./lounge-badges";
import { formatCompactNumber, formatDate } from "../utils";
import type { LoungesListResponse } from "../types";

const COLUMN_COUNT = 8;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-40", lines: 2 },
  { width: "w-14" },
  { width: "w-20" },
  { width: "w-16" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-14" },
  { width: "w-20" },
];

export function LoungesTable({
  data, isLoading, isFetching, onSelectLounge, onPageChange,
}: {
  data?: LoungesListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectLounge: (loungeId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.lounges.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lounge</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Access type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Messages</TableHead>
            <TableHead>Reports</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No lounges match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.lounges.map((lounge) => (
              <TableRow key={lounge.id} className="cursor-pointer" onClick={() => onSelectLounge(lounge.id)}>
                <TableCell className="max-w-80 whitespace-normal">
                  <div className="flex items-start gap-1.5">
                    {lounge.bannedMembersCount > 0 && (
                      <ShieldBan className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{lounge.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lounge.creator ? `by ${lounge.creator.name}` : "Platform lounge"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><KindBadge kind={lounge.kind} /></TableCell>
                <TableCell><AccessTypeBadge accessType={lounge.accessType} /></TableCell>
                <TableCell><LoungeStatusBadge status={lounge.status} /></TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(lounge.membersCount)}</TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(lounge.messagesCount)}</TableCell>
                <TableCell><ReportsBadge count={lounge.pendingReportsCount} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(lounge.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} lounges
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button" size="icon-sm" variant="outline" className="rounded-md"
              disabled={data.pagination.page <= 1}
              onClick={() => onPageChange(Math.max(1, data.pagination.page - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" size="icon-sm" variant="outline" className="rounded-md"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => onPageChange(data.pagination.page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

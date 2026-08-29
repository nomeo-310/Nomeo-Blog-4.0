"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { cn } from "@/lib/utils";
import { formatDate, titleCase } from "../utils";
import type { SubscribersListResponse } from "../types";

const COLUMN_COUNT = 6;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-10" },
  { width: "w-48", lines: 2 },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-24" },
  { width: "w-20" },
];

export function SubscribersTable({
  data, isLoading, isFetching, selected, onToggle, onToggleAll, onSelectSubscriber, onPageChange,
}: {
  data?: SubscribersListResponse;
  isLoading: boolean;
  isFetching: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onSelectSubscriber: (subscriberId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.subscribers.length;
  const ids = (data?.subscribers ?? []).map((s) => s.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(ids)} disabled={ids.length === 0} aria-label="Select all" />
            </TableHead>
            <TableHead>Subscriber</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No subscribers match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => onToggle(s.id)} aria-label="Select row" />
                </TableCell>
                <TableCell className="max-w-56 cursor-pointer whitespace-normal" onClick={() => onSelectSubscriber(s.id)}>
                  <p className="truncate font-medium text-foreground">{s.name || s.email}</p>
                  {s.name && <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.email}</p>}
                </TableCell>
                <TableCell className="cursor-pointer" onClick={() => onSelectSubscriber(s.id)}>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    s.isUnsubscribed ? "bg-destructive/10 text-destructive"
                      : s.isConfirmed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {s.isUnsubscribed ? "Unsubscribed" : s.isConfirmed ? "Confirmed" : "Unconfirmed"}
                  </span>
                </TableCell>
                <TableCell className="cursor-pointer text-muted-foreground" onClick={() => onSelectSubscriber(s.id)}>{titleCase(s.source)}</TableCell>
                <TableCell className="cursor-pointer text-muted-foreground" onClick={() => onSelectSubscriber(s.id)}>{formatDate(s.createdAt)}</TableCell>
                <TableCell className="cursor-pointer text-muted-foreground" onClick={() => onSelectSubscriber(s.id)}>{s.phone ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} subscribers
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

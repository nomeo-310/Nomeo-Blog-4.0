"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "../utils";
import type { FollowersListResponse } from "../types";

const COLUMN_COUNT = 5;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-10" },
  { width: "w-40", lines: 2 },
  { width: "w-40", lines: 2 },
  { width: "w-20" },
  { width: "w-20" },
];

export function FollowersTable({
  data, isLoading, isFetching, selected, onToggle, onToggleAll, onPageChange,
}: {
  data?: FollowersListResponse;
  isLoading: boolean;
  isFetching: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.followers.length;
  const activeIds = (data?.followers ?? []).filter((f) => f.isActive).map((f) => f.id);
  const allActiveSelected = activeIds.length > 0 && activeIds.every((id) => selected.has(id));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allActiveSelected} onCheckedChange={() => onToggleAll(activeIds)} disabled={activeIds.length === 0} aria-label="Select all" />
            </TableHead>
            <TableHead>Follower</TableHead>
            <TableHead>Following</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Since</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No follow relationships match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.followers.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Checkbox checked={selected.has(f.id)} onCheckedChange={() => onToggle(f.id)} disabled={!f.isActive} aria-label="Select row" />
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{f.follower.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.follower.email}</p>
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{f.following.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.following.email}</p>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    f.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    {f.isActive ? "Active" : "Deactivated"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} relationships
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

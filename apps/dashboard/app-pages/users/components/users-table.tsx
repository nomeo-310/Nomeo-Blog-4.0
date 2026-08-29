"use client";

import { ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { BanStatusBadge } from "./user-badges";
import { formatCompactNumber, formatDate } from "../utils";
import type { UsersListResponse } from "../types";

const COLUMN_COUNT = 6;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-10" },
  { width: "w-40", lines: 2 },
  { width: "w-20" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-20" },
];

export function UsersTable({
  data, isLoading, isFetching, selected, onToggle, onToggleAll, onSelectUser, onPageChange,
}: {
  data?: UsersListResponse;
  isLoading: boolean;
  isFetching: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onSelectUser: (userId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.users.length;
  const rowIds = (data?.users ?? []).map((u) => u.id);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(rowIds)} disabled={rowIds.length === 0} aria-label="Select all" />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Followers</TableHead>
            <TableHead>Posts</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No users match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.users.map((user) => (
              <TableRow key={user.id} className="cursor-pointer" onClick={() => onSelectUser(user.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(user.id)} onCheckedChange={() => onToggle(user.id)} aria-label="Select row" />
                </TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium text-foreground">{user.displayName}</p>
                    {user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                </TableCell>
                <TableCell><BanStatusBadge status={user.banStatus} /></TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(user.followersCount)}</TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(user.postsCount)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} users
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

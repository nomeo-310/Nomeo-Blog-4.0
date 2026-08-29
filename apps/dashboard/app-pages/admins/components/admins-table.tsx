"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { AdminRoleBadge, AdminStatusBadge, PendingSetupBadge } from "./admin-badges";
import { formatDate, titleCase } from "../utils";
import type { AdminsListResponse } from "../types";

const COLUMN_COUNT = 5;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-40", lines: 2 },
  { width: "w-20" },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-20" },
];

export function AdminsTable({
  data, isLoading, isFetching, onSelectAdmin, onPageChange,
}: {
  data?: AdminsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectAdmin: (adminId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.admins.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Last login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No admins match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.admins.map((admin) => (
              <TableRow key={admin.id} className="cursor-pointer" onClick={() => onSelectAdmin(admin.id)}>
                <TableCell className="max-w-72 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{admin.displayName || admin.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{admin.email}</p>
                </TableCell>
                <TableCell><AdminRoleBadge role={admin.role} /></TableCell>
                <TableCell>
                  {!admin.isActive && !admin.isOnboarded
                    ? <PendingSetupBadge />
                    : <AdminStatusBadge status={admin.adminStatus} />}
                </TableCell>
                <TableCell className="text-muted-foreground">{titleCase(admin.department)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(admin.lastLoginAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} admins
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

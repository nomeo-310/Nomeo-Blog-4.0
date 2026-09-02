"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { SubscriptionStatusBadge } from "./subscription-badges";
import { formatMoney, formatDate } from "../utils";
import type { SubscriptionsListResponse } from "../types";

const COLUMN_COUNT = 7;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-6" },
  { width: "w-40", lines: 2 },
  { width: "w-24" },
  { width: "w-20" },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-20" },
];

export function SubscriptionsTable({
  data, isLoading, isFetching, selectable, selected, onToggle, onToggleAll, onSelectSubscription, onPageChange,
}: {
  data?: SubscriptionsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  /** Only offered when there's more than one cancellable subscription in the current view. */
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onSelectSubscription: (subscriptionId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.subscriptions.length;
  const cancellableIds = (data?.subscriptions ?? []).filter((s) => s.status !== "cancelled").map((s) => s.id);
  const allSelected = cancellableIds.length > 0 && cancellableIds.every((id) => selected.has(id));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-6">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(cancellableIds)} disabled={cancellableIds.length === 0} aria-label="Select all" />
              </TableHead>
            )}
            <TableHead>Subscriber</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Period ends</TableHead>
            <TableHead>Auto-renew</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={selectable ? SKELETON_COLUMNS : SKELETON_COLUMNS.slice(1)} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={selectable ? COLUMN_COUNT : COLUMN_COUNT - 1} className="py-14 text-center text-sm text-muted-foreground">
                No subscriptions match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.subscriptions.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => onSelectSubscription(s.id)}>
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {s.status !== "cancelled" && (
                      <Checkbox checked={selected.has(s.id)} onCheckedChange={() => onToggle(s.id)} aria-label="Select row" />
                    )}
                  </TableCell>
                )}
                <TableCell className="max-w-56 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{s.subscriber.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.subscriber.email}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.planName}</TableCell>
                <TableCell><SubscriptionStatusBadge status={s.status} /></TableCell>
                <TableCell className="tabular-nums">{formatMoney(s.priceAmount, s.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.currentPeriodEnd)}</TableCell>
                <TableCell className="text-muted-foreground">{s.autoRenew ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} subscriptions
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

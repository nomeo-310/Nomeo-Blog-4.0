"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { PaymentStatusBadge } from "./payment-badges";
import { formatMoney, formatDate } from "../utils";
import type { PaymentsListResponse } from "../types";

const COLUMN_COUNT = 6;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-32" },
  { width: "w-40", lines: 2 },
  { width: "w-24" },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-20" },
];

export function PaymentsTable({
  data, isLoading, isFetching, onSelectPayment, onPageChange,
}: {
  data?: PaymentsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectPayment: (paymentId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.payments.length;

  return (
    <>
      {data && (
        <div className="flex flex-wrap items-center gap-6 border-b border-border px-5 py-3">
          <div>
            <p className="font-heading text-lg font-bold text-foreground">{formatMoney(data.summary.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Total collected (this filter)</p>
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-foreground">{data.summary.successCount}</p>
            <p className="text-xs text-muted-foreground">Successful payments</p>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No payments match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.payments.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => onSelectPayment(p.id)}>
                <TableCell className="font-mono text-xs text-foreground">{p.reference}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{p.payer.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.payer.email}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.planName}</TableCell>
                <TableCell><PaymentStatusBadge status={p.gatewayStatus} /></TableCell>
                <TableCell className="tabular-nums">{formatMoney(p.amountPaid, p.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} payments
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

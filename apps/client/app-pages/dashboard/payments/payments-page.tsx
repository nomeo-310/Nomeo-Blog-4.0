"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCard, CheckmarkCircle02Icon, AlertCircle, ArrowLeft01Icon, ArrowRight01Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { usePayments, type PaymentGatewayStatus } from "@/hooks/use-payments";
import { StatCard } from "./payments-stat-card";
import { PaymentsSkeleton } from "./payments-skeleton";
import { PaymentHistoryRow } from "./payments-row";
import { PaymentsFilterBar } from "./payments-filter-bar";

/**
 * /dashboard/payments — subscription payment history for any signed-in user.
 *
 * Shows:
 *   • Summary stat cards  (total paid, last payment, active plan)
 *   • Status filter pills
 *   • Paginated payment rows with plan name, amount, date, channel, status badge
 *
 * Data flows entirely through the existing usePayments hook → GET /api/payments.
 * No new routes needed.
 *
 * Layout is composed from sibling sub-components in this same folder
 * (payments-stat-card, payments-filter-bar, payments-row, payments-status-badge,
 * payments-skeleton); this file owns the data layer and top-level composition only.
 */

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentGatewayStatus | "all">("all");
  const [page,         setPage]         = useState(1);
  const LIMIT = 15;

  const { data, isLoading, isError, refetch, isFetching } = usePayments({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: LIMIT,
  });

  const payments    = data?.payments    ?? [];
  const pagination  = data?.pagination;

  // Derive summary stats from the full success list (page 1 only — quick approximation)
  const { data: allData } = usePayments({ status: "success", limit: 50 });
  const successPayments   = allData?.payments ?? [];
  const totalPaidKobo     = successPayments.reduce((sum, p) => sum + (p.amountPaid ?? p.amount ?? 0), 0);
  const lastPayment       = successPayments[0] ?? null;

  const handleFilterChange = (key: PaymentGatewayStatus | "all") => {
    setStatusFilter(key);
    setPage(1);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your subscription payment history on Nomeo.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<HugeiconsIcon icon={CreditCard} className="h-5 w-5" />}
          label="Total paid"
          value={formatKobo(totalPaidKobo)}
          sub="All successful payments"
        />
        <StatCard
          icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5" />}
          label="Last payment"
          value={lastPayment ? formatKobo(lastPayment.amountPaid ?? lastPayment.amount) : "—"}
          sub={lastPayment?.paidAt ? formatDate(lastPayment.paidAt) : "No payments yet"}
        />
        <StatCard
          icon={<HugeiconsIcon icon={Invoice01Icon} className="h-5 w-5" />}
          label="Active plan"
          value={lastPayment?.plan?.name ?? "—"}
          sub={lastPayment?.plan?.interval
            ? `Billed ${lastPayment.plan.interval}`
            : "No active subscription"}
        />
      </div>

      {/* Status filter pills */}
      <PaymentsFilterBar value={statusFilter} onChange={handleFilterChange} />

      {/* Payments table */}
      {isLoading ? (
        <PaymentsSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
          <HugeiconsIcon icon={AlertCircle} className="h-8 w-8 text-destructive/50" />
          <p className="mt-4 text-sm font-medium text-foreground">Failed to load payments</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <HugeiconsIcon icon={CreditCard} className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-4 font-heading text-base font-bold text-foreground">
            {statusFilter === "all" ? "No payments yet" : `No ${statusFilter} payments`}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {statusFilter === "all"
              ? "Your subscription payment history will appear here once you subscribe."
              : "Try a different filter to see other payments."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_120px_120px_100px_100px] gap-4 border-b border-border bg-muted/20 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:grid">
            <span>Plan</span>
            <span>Amount</span>
            <span>Date</span>
            <span>Method</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-border">
            {payments.map((p) => (
              <PaymentHistoryRow key={p.id} payment={p} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-foreground">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || isFetching}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

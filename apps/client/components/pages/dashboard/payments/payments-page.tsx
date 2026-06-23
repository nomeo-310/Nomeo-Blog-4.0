"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCard, CheckmarkCircle02Icon, CancelCircleIcon, Clock3Icon, AlertCircle, ArrowLeft01Icon, ArrowRight01Icon, FilterHorizontalIcon, Invoice01Icon, Clock03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { usePayments, type PaymentGatewayStatus } from "@/hooks/use-payments";

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
 */

const STATUS_FILTERS: { key: PaymentGatewayStatus | "all"; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "success",   label: "Successful" },
  { key: "pending",   label: "Pending"   },
  { key: "failed",    label: "Failed"    },
  { key: "abandoned", label: "Abandoned" },
];

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
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground self-center">
          <HugeiconsIcon icon={FilterHorizontalIcon} className="h-3.5 w-3.5" /> Filter:
        </span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

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
              <div
                key={p.id}
                className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1fr_120px_120px_100px_100px] sm:items-center sm:gap-4"
              >
                {/* Plan */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.plan?.name ?? "Nomeo Membership"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.plan?.interval ? `Billed ${p.plan.interval}` : "Subscription"}
                    {" · "}
                    <span className="font-mono text-[11px]">{p.reference}</span>
                  </p>
                </div>

                {/* Amount */}
                <p className="text-sm font-bold text-foreground">
                  {p.amountFormatted}
                </p>

                {/* Date */}
                <p className="text-xs text-muted-foreground">
                  {p.paidAt ? formatDate(p.paidAt) : p.createdAt ? formatDate(p.createdAt) : "—"}
                </p>

                {/* Method */}
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={CreditCard} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">
                    {p.channel ?? "—"}
                    {p.cardLast4 && ` ···${p.cardLast4}`}
                  </span>
                </div>

                {/* Status badge */}
                <StatusBadge status={p.status} />
              </div>
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

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-4 font-heading text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentGatewayStatus }) {
  const map: Record<PaymentGatewayStatus, { icon: React.ReactNode; cls: string; label: string }> = {
    success:   { icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3.5 w-3.5" />, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",    label: "Success"   },
    pending:   { icon: <HugeiconsIcon icon={Clock03Icon}       className="h-3.5 w-3.5" />, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending"   },
    failed:    { icon: <HugeiconsIcon icon={CancelCircleIcon}      className="h-3.5 w-3.5" />, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             label: "Failed"    },
    abandoned: { icon: <HugeiconsIcon icon={AlertCircle}  className="h-3.5 w-3.5" />, cls: "bg-muted text-muted-foreground",                                           label: "Abandoned" },
    reversed:  { icon: <RefreshCcw   className="h-3.5 w-3.5" />, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Reversed"  },
  };
  const { icon, cls, label } = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {icon}{label}
    </span>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
          <div className="h-3.5 w-16 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
      ))}
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
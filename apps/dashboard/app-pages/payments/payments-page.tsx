"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentsList } from "./use-payments-list";
import { PaymentsFilterBar } from "./components/payments-filter-bar";
import { PaymentsTable }     from "./components/payments-table";
import { PaymentDetailModal } from "./components/payment-detail-modal";
import type { PaymentStatusFilter, PaymentSortBy } from "./types";

export default function PaymentsPage() {
  const [status, setStatus]   = useState<PaymentStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [sortBy, setSortBy]   = useState<PaymentSortBy>("newest");
  const [page, setPage]       = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = usePaymentsList({
    status, search, dateFrom, dateTo, sortBy, page, limit: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Every subscription payment processed through Paystack.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      <PaymentsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        dateFrom={dateFrom} onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} onDateToChange={(v) => { setDateTo(v); setPage(1); }}
        sortBy={sortBy} onSortByChange={setSortBy}
      />

      <div className="rounded-2xl border border-border bg-card">
        <PaymentsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectPayment={setSelectedPaymentId}
          onPageChange={setPage}
        />
      </div>

      <PaymentDetailModal paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} />
    </div>
  );
}

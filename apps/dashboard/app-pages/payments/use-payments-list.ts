"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { PaymentStatusFilter, PaymentSortBy, PaymentsListResponse } from "./types";

export interface PaymentsListFilters {
  status: PaymentStatusFilter;
  search: string;
  dateFrom: string;
  dateTo: string;
  sortBy: PaymentSortBy;
  page: number;
  limit: number;
}

async function fetchPayments(filters: PaymentsListFilters): Promise<PaymentsListResponse> {
  const { data } = await api.get<PaymentsListResponse>("/api/admin/payments", {
    params: {
      status: filters.status,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function usePaymentsList(filters: PaymentsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-payments-list", filters],
    queryFn:  () => fetchPayments(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

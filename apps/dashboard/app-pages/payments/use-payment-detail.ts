"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { PaymentDetailResponse } from "./types";

async function fetchPaymentDetail(paymentId: string): Promise<PaymentDetailResponse> {
  const { data } = await api.get<PaymentDetailResponse>(`/api/admin/payments/${paymentId}`);
  return data;
}

export function usePaymentDetail(paymentId: string | null) {
  return useQuery({
    queryKey: ["admin-payment-detail", paymentId],
    queryFn:  () => fetchPaymentDetail(paymentId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!paymentId,
  });
}

import { useEffect, useRef } from "react";
import { useQuery, useMutation, keepPreviousData, type UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";

export type PaymentGatewayStatus = "pending" | "success" | "failed" | "abandoned" | "reversed";

export interface PaymentRow {
  id: string;
  reference: string;
  status: PaymentGatewayStatus;
  amount: number;
  amountPaid: number;
  amountFormatted: string;
  currency: string;
  channel: string | null;
  cardLast4: string | null;
  cardType: string | null;
  paidAt: string | null;
  createdAt: string | null;
  plan: { id: string; name: string; interval: string } | null;
}

export interface PaymentsListResponse {
  success: boolean;
  payments: PaymentRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaymentsListFilters {
  status?: PaymentGatewayStatus;
  page?: number;
  limit?: number;
}

export interface InitiatePaymentInput {
  planId: string;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  reference: string;
  accessCode: string;
  authorizationUrl: string;
}

export interface VerifyPaymentResponse {
  paymentId: string;
  reference: string;
  gatewayStatus: PaymentGatewayStatus;
  amount: number;
  amountPaid: number;
  currency: string;
  paidAt?: string;
  channel?: string;
  gatewayResponse?: string;
}

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (filters: PaymentsListFilters) => [...paymentKeys.lists(), filters] as const,
  verify: (reference: string) => [...paymentKeys.all, "verify", reference] as const,
};

type VerifyResponse = { success: boolean; data: VerifyPaymentResponse };

export function usePayments(
  filters: PaymentsListFilters = {},
  options?: Omit<UseQueryOptions<PaymentsListResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery<PaymentsListResponse, Error>({
    queryKey: paymentKeys.list(filters),
    queryFn: async () => {
      // Plain axios call with params mapping
      const response = await axios.get<PaymentsListResponse>("/api/payments", {
        params: filters,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useInitiatePayment() {
  return useMutation<{ success: boolean; data: InitiatePaymentResponse }, Error, InitiatePaymentInput>({
    mutationFn: async (input) => {
      const response = await axios.post<{ success: boolean; data: InitiatePaymentResponse }>(
        "/api/payments/initiate",
        input
      );
      return response.data;
    },
  });
}

export function useVerifyPayment(
  reference: string,
  options?: Omit<UseQueryOptions<VerifyResponse, Error>, "queryKey" | "queryFn"> & {
    onSuccess?: (data: VerifyResponse) => void;
  }
) {
  const { onSuccess, ...queryOptions } = options ?? {};

  const query = useQuery<VerifyResponse, Error>({
    queryKey: paymentKeys.verify(reference),
    queryFn: async () => {
      const response = await axios.get<VerifyResponse>(`/api/payments/verify/${reference}`);
      return response.data;
    },
    enabled: !!reference,
    ...queryOptions,
  });

  const prevRef = useRef<string>("");
  useEffect(() => {
    if (!query.data || !onSuccess || !query.isSuccess) return;
    const serialised = JSON.stringify(query.data);
    if (serialised === prevRef.current) return;
    prevRef.current = serialised;
    onSuccess(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isSuccess]);

  return query;
}
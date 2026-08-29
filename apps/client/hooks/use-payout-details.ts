"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

export interface Bank {
  name: string;
  code: string;
}

export interface PayoutDetails {
  bankCode: string;
  bankName: string;
  accountNumber: string; // masked, e.g. "•••• 1234"
  accountName: string;
  verified: boolean;
  verifiedAt: string | null;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

/** Live Paystack bank list for the bank picker. */
export function usePayoutBanks() {
  return useQuery({
    queryKey: ["payout-banks"],
    queryFn: async () => {
      const { data } = await api.get<{ banks: Bank[] }>("/api/creator/payout-details/banks");
      return data.banks;
    },
    staleTime: 60 * 60_000, // bank list barely changes
  });
}

/** The signed-in creator's own payout bank account, masked. */
export function usePayoutDetails() {
  return useQuery({
    queryKey: ["payout-details"],
    queryFn: async () => {
      const { data } = await api.get<{ payoutDetails: PayoutDetails | null }>("/api/creator/payout-details");
      return data.payoutDetails;
    },
    staleTime: 30_000,
  });
}

export function useSavePayoutDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bankCode: string; accountNumber: string }) => {
      const { data } = await api.post<{ payoutDetails: PayoutDetails }>("/api/creator/payout-details", input);
      return data.payoutDetails;
    },
    onSuccess: (payoutDetails) => {
      toast.success("Payout account verified and saved.");
      queryClient.setQueryData(["payout-details"], payoutDetails);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to save payout details.")),
  });
}

export function useRequestPayout(earningId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/creator/earnings/${earningId}/request-payout`);
      return data;
    },
    onSuccess: () => {
      toast.success("Payout requested — an admin will process it shortly.");
      queryClient.invalidateQueries({ queryKey: ["creator-earnings"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to request payout.")),
  });
}

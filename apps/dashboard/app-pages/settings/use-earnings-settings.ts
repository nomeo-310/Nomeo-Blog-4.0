"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

export type PayoutModel = "fixed_rate" | "pool_share";

export interface EarningsSettings {
  payoutModel: PayoutModel;
  platformCutPercent: number;
  ratePerCompletedRead: number; // kobo, fixed_rate mode
  completedReadWeight: number;  // pool_share mode
  minimumPayoutAmount: number;  // kobo
  currency: string;
  updatedAt: string;
}

export interface UpdateEarningsSettingsInput {
  payoutModel?: PayoutModel;
  platformCutPercent?: number;
  ratePerCompletedRead?: number;
  completedReadWeight?: number;
  minimumPayoutAmount?: number;
}

const KEY = ["admin-earnings-settings"] as const;

/** The DB-backed knobs behind creator pay. */
export function useEarningsSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<{ settings: EarningsSettings }>("/api/admin/settings/earnings");
      return data.settings;
    },
    staleTime: 30_000,
  });
}

export function useUpdateEarningsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateEarningsSettingsInput) => {
      const { data } = await api.patch<{ settings: EarningsSettings }>("/api/admin/settings/earnings", input);
      return data.settings;
    },
    onSuccess: (settings) => {
      toast.success("Earnings settings updated.");
      queryClient.setQueryData(KEY, settings);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Failed to update settings.");
    },
  });
}

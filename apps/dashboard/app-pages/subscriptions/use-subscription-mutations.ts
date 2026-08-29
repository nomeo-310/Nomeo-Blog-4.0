"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export function useCancelSubscription(subscriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string }) =>
      api.patch(`/api/admin/subscriptions/${subscriptionId}`, { action: "cancel", reason: input.reason }),
    onSuccess: () => {
      toast.success("Subscription cancelled.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-detail", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to cancel subscription.")),
  });
}

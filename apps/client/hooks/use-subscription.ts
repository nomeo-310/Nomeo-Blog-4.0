"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired" | "paused";
export type SubscriptionInterval = "monthly" | "quarterly" | "biannually" | "yearly";

export interface SubscriptionData {
  id: string;
  status: SubscriptionStatus;
  interval: SubscriptionInterval;
  priceAmount: number;
  priceFormatted: string;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  autoRenew: boolean;
  cancelledAt?: string | null;
  isActive: boolean;
  isInTrial: boolean;
  daysUntilRenewal: number;
  plan?: {
    id: string;
    name: string;
    interval: string;
    priceAmount: number;
    currency: string;
    trialDays: number;
  } | null;
}

interface CreateSubscriptionBody {
  planId: string;
  paystackReference: string;
}

interface CancelOptions {
  reason?: string;
  immediately?: boolean;
}

export const SUBSCRIPTION_QUERY_KEY = ["subscription"] as const;

export function useSubscription() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, error, isLoading } = useQuery<SubscriptionData | null, Error>({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: async () => {
      const response = await axios.get<{ subscription: SubscriptionData | null }>("/api/subscriptions");
      return response.data.subscription;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const subscription = data ?? null;
  const isActive = subscription?.isActive ?? false;

  const subscribeMutation = useMutation<SubscriptionData, Error, CreateSubscriptionBody>({
    mutationFn: async (body) => {
      const response = await axios.post<{ subscription: SubscriptionData }>("/api/subscriptions", body);
      return response.data.subscription;
    },
    onSuccess: (newSub) => {
      queryClient.setQueryData<SubscriptionData | null>(SUBSCRIPTION_QUERY_KEY, newSub);
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    },
  });

  const cancelMutation = useMutation<void, Error, CancelOptions | undefined>({
    mutationFn: async (opts = {}) => {
      if (!subscription) throw new Error("No active subscription");
      await axios.patch(`/api/subscriptions/${subscription.id}`, { action: "cancel", ...opts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    },
  });

  const reactivateMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription to reactivate");
      await axios.patch(`/api/subscriptions/${subscription.id}`, { action: "reactivate" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    },
  });

  return {
    subscription,
    isLoading,
    error,
    isActive,
    isTrialing: subscription?.isInTrial ?? false,
    daysLeft: subscription?.daysUntilRenewal ?? 0,

    subscribe: subscribeMutation.mutateAsync,
    cancel: (opts?: CancelOptions) => cancelMutation.mutateAsync(opts),
    reactivate: reactivateMutation.mutateAsync,

    isSubscribing: subscribeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,

    goToMembership: () => router.push("/membership"),
    refresh: () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY }),
  };
}
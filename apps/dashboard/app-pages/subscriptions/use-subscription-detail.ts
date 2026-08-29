"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { SubscriptionDetailResponse } from "./types";

async function fetchSubscriptionDetail(subscriptionId: string): Promise<SubscriptionDetailResponse> {
  const { data } = await api.get<SubscriptionDetailResponse>(`/api/admin/subscriptions/${subscriptionId}`);
  return data;
}

export function useSubscriptionDetail(subscriptionId: string | null) {
  return useQuery({
    queryKey: ["admin-subscription-detail", subscriptionId],
    queryFn:  () => fetchSubscriptionDetail(subscriptionId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!subscriptionId,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { SubscriberDetailResponse } from "./types";

async function fetchSubscriberDetail(subscriberId: string): Promise<SubscriberDetailResponse> {
  const { data } = await api.get<SubscriberDetailResponse>(`/api/admin/subscribers/${subscriberId}`);
  return data;
}

export function useSubscriberDetail(subscriberId: string | null) {
  return useQuery({
    queryKey: ["admin-subscriber-detail", subscriberId],
    queryFn:  () => fetchSubscriberDetail(subscriberId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!subscriberId,
  });
}

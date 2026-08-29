"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { CreatorDetailResponse, CreatorEarningsResponse } from "./types";

async function fetchCreatorDetail(creatorId: string): Promise<CreatorDetailResponse> {
  const { data } = await api.get<CreatorDetailResponse>(`/api/admin/creators/${creatorId}`);
  return data;
}

export function useCreatorDetail(creatorId: string | null) {
  return useQuery({
    queryKey: ["admin-creator-detail", creatorId],
    queryFn:  () => fetchCreatorDetail(creatorId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!creatorId,
  });
}

async function fetchCreatorEarnings(creatorId: string, payoutStatus: string, page: number): Promise<CreatorEarningsResponse> {
  const { data } = await api.get<CreatorEarningsResponse>(`/api/admin/creators/${creatorId}/earnings`, {
    params: { payoutStatus, page, limit: 12 },
  });
  return data;
}

export function useCreatorEarnings(creatorId: string | null, payoutStatus: string, page: number) {
  return useQuery({
    queryKey: ["admin-creator-earnings", creatorId, payoutStatus, page],
    queryFn:  () => fetchCreatorEarnings(creatorId!, payoutStatus, page),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!creatorId,
    placeholderData: (previousData) => previousData,
  });
}

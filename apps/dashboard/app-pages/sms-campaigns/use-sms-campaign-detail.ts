"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { SmsCampaignDetailResponse } from "./types";

async function fetchSmsCampaignDetail(campaignId: string): Promise<SmsCampaignDetailResponse> {
  const { data } = await api.get<SmsCampaignDetailResponse>(`/api/admin/sms-campaigns/${campaignId}`);
  return data;
}

export function useSmsCampaignDetail(campaignId: string | null) {
  return useQuery({
    queryKey: ["admin-sms-campaign-detail", campaignId],
    queryFn:  () => fetchSmsCampaignDetail(campaignId!),
    staleTime: 10_000,
    retry:     1,
    enabled:   !!campaignId,
    refetchInterval: (query) => (query.state.data?.campaign.status === "sending" ? 5_000 : false),
  });
}

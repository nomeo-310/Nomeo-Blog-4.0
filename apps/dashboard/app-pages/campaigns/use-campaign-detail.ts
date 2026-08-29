"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { CampaignDetailResponse } from "./types";

async function fetchCampaignDetail(campaignId: string): Promise<CampaignDetailResponse> {
  const { data } = await api.get<CampaignDetailResponse>(`/api/admin/campaigns/${campaignId}`);
  return data;
}

export function useCampaignDetail(campaignId: string | null) {
  return useQuery({
    queryKey: ["admin-campaign-detail", campaignId],
    queryFn:  () => fetchCampaignDetail(campaignId!),
    staleTime: 10_000,
    retry:     1,
    enabled:   !!campaignId,
    // Poll while sending so the recipient tally updates as the cron worker drains the queue.
    refetchInterval: (query) => (query.state.data?.campaign.status === "sending" ? 5_000 : false),
  });
}

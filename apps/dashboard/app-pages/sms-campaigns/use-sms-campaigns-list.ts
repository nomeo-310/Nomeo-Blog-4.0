"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { SmsCampaignStatusFilter, SmsCampaignsListResponse } from "./types";

export interface SmsCampaignsListFilters {
  status: SmsCampaignStatusFilter;
  search: string;
  page: number;
  limit: number;
}

async function fetchSmsCampaigns(filters: SmsCampaignsListFilters): Promise<SmsCampaignsListResponse> {
  const { data } = await api.get<SmsCampaignsListResponse>("/api/admin/sms-campaigns", {
    params: { status: filters.status, search: filters.search || undefined, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useSmsCampaignsList(filters: SmsCampaignsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-sms-campaigns-list", filters],
    queryFn:  () => fetchSmsCampaigns(filters),
    staleTime: 15_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

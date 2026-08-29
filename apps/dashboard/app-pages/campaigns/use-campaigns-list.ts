"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { CampaignStatusFilter, CampaignTypeFilter, CampaignsListResponse } from "./types";

export interface CampaignsListFilters {
  status: CampaignStatusFilter;
  type: CampaignTypeFilter;
  search: string;
  page: number;
  limit: number;
}

async function fetchCampaigns(filters: CampaignsListFilters): Promise<CampaignsListResponse> {
  const { data } = await api.get<CampaignsListResponse>("/api/admin/campaigns", {
    params: { status: filters.status, type: filters.type, search: filters.search || undefined, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useCampaignsList(filters: CampaignsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-campaigns-list", filters],
    queryFn:  () => fetchCampaigns(filters),
    staleTime: 15_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

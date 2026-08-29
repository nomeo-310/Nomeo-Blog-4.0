"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { CreatorStatusFilter, CreatorSortBy, CreatorsListResponse } from "./types";

export interface CreatorsListFilters {
  creatorStatus: CreatorStatusFilter;
  search: string;
  sortBy: CreatorSortBy;
  page: number;
  limit: number;
}

async function fetchCreators(filters: CreatorsListFilters): Promise<CreatorsListResponse> {
  const { data } = await api.get<CreatorsListResponse>("/api/admin/creators", {
    params: {
      creatorStatus: filters.creatorStatus,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useCreatorsList(filters: CreatorsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-creators-list", filters],
    queryFn:  () => fetchCreators(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

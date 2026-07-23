"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type {
  AdvertPlacementFilter, AdvertSortBy, AdvertStatusFilter, AdvertTypeFilter, AdvertsListResponse,
} from "./types";

export interface AdvertsListFilters {
  type: AdvertTypeFilter;
  status: AdvertStatusFilter;
  placement: AdvertPlacementFilter;
  search: string;
  sortBy: AdvertSortBy;
  page: number;
  limit: number;
}

async function fetchAdverts(filters: AdvertsListFilters): Promise<AdvertsListResponse> {
  const { data } = await api.get<AdvertsListResponse>("/api/admin/adverts", {
    params: {
      type: filters.type,
      status: filters.status,
      placement: filters.placement,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useAdvertsList(filters: AdvertsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-adverts-list", filters],
    queryFn:  () => fetchAdverts(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

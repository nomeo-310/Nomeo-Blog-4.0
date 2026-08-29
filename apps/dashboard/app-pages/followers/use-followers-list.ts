"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { FollowerStatusFilter, FollowerSortBy, FollowersListResponse } from "./types";

export interface FollowersListFilters {
  status: FollowerStatusFilter;
  search: string;
  sortBy: FollowerSortBy;
  page: number;
  limit: number;
}

async function fetchFollowers(filters: FollowersListFilters): Promise<FollowersListResponse> {
  const { data } = await api.get<FollowersListResponse>("/api/admin/followers", {
    params: { status: filters.status, search: filters.search || undefined, sortBy: filters.sortBy, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useFollowersList(filters: FollowersListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-followers-list", filters],
    queryFn:  () => fetchFollowers(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

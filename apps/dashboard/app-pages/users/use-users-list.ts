"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { UserBanFilter, UserSortBy, UsersListResponse } from "./types";

export interface UsersListFilters {
  banStatus: UserBanFilter;
  search: string;
  sortBy: UserSortBy;
  page: number;
  limit: number;
}

async function fetchUsers(filters: UsersListFilters): Promise<UsersListResponse> {
  const { data } = await api.get<UsersListResponse>("/api/admin/users", {
    params: {
      banStatus: filters.banStatus,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useUsersList(filters: UsersListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-users-list", filters],
    queryFn:  () => fetchUsers(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

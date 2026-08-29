"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { AdminRoleFilter, AdminStatusFilter, AdminsListResponse } from "./types";

export interface AdminsListFilters {
  role: AdminRoleFilter;
  adminStatus: AdminStatusFilter;
  search: string;
  page: number;
  limit: number;
}

async function fetchAdmins(filters: AdminsListFilters): Promise<AdminsListResponse> {
  const { data } = await api.get<AdminsListResponse>("/api/admin/admins", {
    params: {
      role: filters.role,
      adminStatus: filters.adminStatus,
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useAdminsList(filters: AdminsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-admins-list", filters],
    queryFn:  () => fetchAdmins(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

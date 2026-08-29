"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { ApplicationStatusFilter, ApplicationsListResponse } from "./types";

export interface ApplicationsListFilters {
  status: ApplicationStatusFilter;
  page: number;
  limit: number;
}

async function fetchApplications(filters: ApplicationsListFilters): Promise<ApplicationsListResponse> {
  const { data } = await api.get<ApplicationsListResponse>("/api/admin/creators/applications", {
    params: { status: filters.status, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useApplicationsList(filters: ApplicationsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-applications-list", filters],
    queryFn:  () => fetchApplications(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

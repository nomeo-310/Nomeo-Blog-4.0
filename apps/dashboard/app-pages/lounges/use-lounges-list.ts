"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type {
  LoungeAccessTypeFilter, LoungeKindFilter, LoungeSortBy, LoungeStatusFilter, LoungesListResponse,
} from "./types";

export interface LoungesListFilters {
  kind: LoungeKindFilter;
  status: LoungeStatusFilter;
  accessType: LoungeAccessTypeFilter;
  hasOpenReports: boolean;
  search: string;
  sortBy: LoungeSortBy;
  page: number;
  limit: number;
}

async function fetchLounges(filters: LoungesListFilters): Promise<LoungesListResponse> {
  const { data } = await api.get<LoungesListResponse>("/api/admin/lounges", {
    params: {
      kind: filters.kind,
      status: filters.status,
      accessType: filters.accessType,
      hasOpenReports: filters.hasOpenReports || undefined,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useLoungesList(filters: LoungesListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-lounges-list", filters],
    queryFn:  () => fetchLounges(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

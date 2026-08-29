"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { SubscriberStatusFilter, SubscriberSourceFilter, SubscribersListResponse } from "./types";

export interface SubscribersListFilters {
  status: SubscriberStatusFilter;
  source: SubscriberSourceFilter;
  search: string;
  page: number;
  limit: number;
}

async function fetchSubscribers(filters: SubscribersListFilters): Promise<SubscribersListResponse> {
  const { data } = await api.get<SubscribersListResponse>("/api/admin/subscribers", {
    params: { status: filters.status, source: filters.source, search: filters.search || undefined, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useSubscribersList(filters: SubscribersListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-subscribers-list", filters],
    queryFn:  () => fetchSubscribers(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

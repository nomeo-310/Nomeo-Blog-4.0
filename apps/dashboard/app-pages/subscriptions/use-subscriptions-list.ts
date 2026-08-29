"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { SubscriptionStatusFilter, SubscriptionSortBy, SubscriptionsListResponse } from "./types";

export interface SubscriptionsListFilters {
  status: SubscriptionStatusFilter;
  search: string;
  sortBy: SubscriptionSortBy;
  page: number;
  limit: number;
}

async function fetchSubscriptions(filters: SubscriptionsListFilters): Promise<SubscriptionsListResponse> {
  const { data } = await api.get<SubscriptionsListResponse>("/api/admin/subscriptions", {
    params: { status: filters.status, search: filters.search || undefined, sortBy: filters.sortBy, page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useSubscriptionsList(filters: SubscriptionsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-subscriptions-list", filters],
    queryFn:  () => fetchSubscriptions(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

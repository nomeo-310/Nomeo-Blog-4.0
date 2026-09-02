"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type {
  ErrorSourceFilter, ErrorSeverityFilter, ErrorResolvedFilter, ErrorLogListResponse,
} from "./types";

export interface ErrorLogListFilters {
  source: ErrorSourceFilter;
  severity: ErrorSeverityFilter;
  resolved: ErrorResolvedFilter;
  search: string;
  page: number;
  limit: number;
}

async function fetchErrorLog(filters: ErrorLogListFilters): Promise<ErrorLogListResponse> {
  const { data } = await api.get<ErrorLogListResponse>("/api/admin/errors", {
    params: {
      source: filters.source,
      severity: filters.severity,
      resolved: filters.resolved,
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useErrorLogList(filters: ErrorLogListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-error-log-list", filters],
    queryFn:  () => fetchErrorLog(filters),
    staleTime: 15_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

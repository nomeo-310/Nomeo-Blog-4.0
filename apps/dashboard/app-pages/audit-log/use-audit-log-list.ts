"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type {
  AuditCategoryFilter, AuditSeverityFilter, AuditStatusFilter, AuditTargetTypeFilter, AuditLogListResponse,
} from "./types";

export interface AuditLogListFilters {
  category: AuditCategoryFilter;
  severity: AuditSeverityFilter;
  status: AuditStatusFilter;
  targetType: AuditTargetTypeFilter;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

async function fetchAuditLog(filters: AuditLogListFilters): Promise<AuditLogListResponse> {
  const { data } = await api.get<AuditLogListResponse>("/api/admin/audit-log", {
    params: {
      category: filters.category,
      severity: filters.severity,
      status: filters.status,
      targetType: filters.targetType,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function useAuditLogList(filters: AuditLogListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-audit-log-list", filters],
    queryFn:  () => fetchAuditLog(filters),
    staleTime: 15_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

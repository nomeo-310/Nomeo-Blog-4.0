"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { AdminDetailResponse } from "./types";

async function fetchAdminDetail(adminId: string): Promise<AdminDetailResponse> {
  const { data } = await api.get<AdminDetailResponse>(`/api/admin/admins/${adminId}`);
  return data;
}

export function useAdminDetail(adminId: string | null) {
  return useQuery({
    queryKey: ["admin-admin-detail", adminId],
    queryFn:  () => fetchAdminDetail(adminId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!adminId,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { UserDetailResponse } from "./types";

async function fetchUserDetail(userId: string): Promise<UserDetailResponse> {
  const { data } = await api.get<UserDetailResponse>(`/api/admin/users/${userId}`);
  return data;
}

export function useUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn:  () => fetchUserDetail(userId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!userId,
  });
}

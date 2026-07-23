"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type { AdvertDetailResponse } from "./types";

async function fetchAdvertDetail(advertId: string): Promise<AdvertDetailResponse> {
  const { data } = await api.get<AdvertDetailResponse>(`/api/admin/adverts/${advertId}`);
  return data;
}

export function useAdvertDetail(advertId: string | null) {
  return useQuery({
    queryKey: ["admin-advert-detail", advertId],
    queryFn:  () => fetchAdvertDetail(advertId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!advertId,
  });
}

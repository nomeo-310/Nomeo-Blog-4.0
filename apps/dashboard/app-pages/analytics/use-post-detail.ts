"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import type { PostDetailResponse } from "./types";

async function fetchPostDetail(postId: string): Promise<PostDetailResponse> {
  const { data } = await api.get<PostDetailResponse>(`/api/admin/analytics/posts/${postId}`);
  return data;
}

export function usePostDetail(postId: string | null) {
  return useQuery({
    queryKey: ["admin-analytics-post-detail", postId],
    queryFn:  () => fetchPostDetail(postId!),
    staleTime: 60_000,
    retry:     1,
    enabled:   !!postId,
  });
}

"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import type { CommentsListResponse, PostDetailResponse } from "./types";

async function fetchPostDetail(postId: string): Promise<PostDetailResponse> {
  const { data } = await api.get<PostDetailResponse>(`/api/admin/posts/${postId}`);
  return data;
}

export function usePostDetail(postId: string | null) {
  return useQuery({
    queryKey: ["admin-post-detail", postId],
    queryFn:  () => fetchPostDetail(postId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!postId,
  });
}

async function fetchPostComments(postId: string, page: number): Promise<CommentsListResponse> {
  const { data } = await api.get<CommentsListResponse>(`/api/admin/posts/${postId}/comments`, {
    params: { page, limit: 15 },
  });
  return data;
}

export function usePostComments(postId: string | null, page: number) {
  return useQuery({
    queryKey: ["admin-post-comments", postId, page],
    queryFn:  () => fetchPostComments(postId!, page),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!postId,
    placeholderData: (previousData) => previousData,
  });
}

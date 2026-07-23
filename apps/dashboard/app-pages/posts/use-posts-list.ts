"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { PostAccessFilter, PostSortBy, PostsListResponse, PostStatusFilter } from "./types";

export interface PostsListFilters {
  status: PostStatusFilter;
  access: PostAccessFilter;
  hasOpenReports: boolean;
  search: string;
  sortBy: PostSortBy;
  page: number;
  limit: number;
}

async function fetchPosts(filters: PostsListFilters): Promise<PostsListResponse> {
  const { data } = await api.get<PostsListResponse>("/api/admin/posts", {
    params: {
      status: filters.status,
      access: filters.access,
      hasOpenReports: filters.hasOpenReports || undefined,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return data;
}

export function usePostsList(filters: PostsListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-posts-list", filters],
    queryFn:  () => fetchPosts(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

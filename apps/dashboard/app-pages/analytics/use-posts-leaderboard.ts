"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import { dateWindowToParams } from "./utils";
import type { DateWindow, PostAccessFilter, PostSortBy, PostsLeaderboardResponse } from "./types";

export interface PostsLeaderboardFilters {
  window:   DateWindow;
  access:   PostAccessFilter;
  topic:    string | null;
  search:   string;
  sortBy:   PostSortBy;
  order:    "asc" | "desc";
  page:     number;
  limit:    number;
}

async function fetchLeaderboard(filters: PostsLeaderboardFilters): Promise<PostsLeaderboardResponse> {
  const { data } = await api.get<PostsLeaderboardResponse>("/api/admin/analytics/posts", {
    params: {
      ...dateWindowToParams(filters.window),
      access:  filters.access,
      topic:   filters.topic ?? undefined,
      search:  filters.search || undefined,
      sortBy:  filters.sortBy,
      order:   filters.order,
      page:    filters.page,
      limit:   filters.limit,
    },
  });
  return data;
}

export function usePostsLeaderboard(filters: PostsLeaderboardFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-analytics-posts", filters],
    queryFn:  () => fetchLeaderboard(filters),
    staleTime: 60_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

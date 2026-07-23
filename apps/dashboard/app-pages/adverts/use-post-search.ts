"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";

export interface PostSearchResult {
  id: string;
  title: string;
  slug: string;
  authorName: string;
}

interface RawPostListResponse {
  posts: { id: string; title: string; slug: string; author: { name: string } }[];
}

async function searchPosts(query: string): Promise<PostSearchResult[]> {
  const { data } = await api.get<RawPostListResponse>("/api/admin/posts", {
    params: { search: query, status: "published", sortBy: "newest", limit: 6 },
  });
  return data.posts.map((p) => ({ id: p.id, title: p.title, slug: p.slug, authorName: p.author?.name ?? "Unknown" }));
}

export function usePostSearch(query: string) {
  return useQuery({
    queryKey: ["admin-adverts-post-search", query],
    queryFn:  () => searchPosts(query),
    staleTime: 30_000,
    enabled:   query.trim().length >= 2,
  });
}

"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

/**
 * useSearch
 * ---------
 * React Query-backed search with filter-before-search scoping and debounce.
 *
 * - `type` is sent to the server so it only queries the relevant collections.
 * - The query is debounced (default 300ms) so we don't fire on every keystroke.
 * - `keepPreviousData` keeps the last results on screen while the next load
 *   runs, so the list doesn't flash empty between keystrokes.
 * - Results are cached per (query, type) key, so toggling filters or
 *   re-typing a previous term is instant.
 *
 * Returns the unified result shape from /api/search plus the per-type counts
 * for the filter pill badges.
 */

export type SearchType = "all" | "story" | "author" | "tag" | "lounge";

export interface SearchResult {
  id: string;
  type: "story" | "author" | "tag" | "lounge";
  title: string;
  subtitle: string;
  category: string;
  preview: string;
  href: string;
  /** author only */
  userId?: string;
  avatar?: string;
}

interface SearchResponse {
  results: SearchResult[];
  counts: Partial<Record<SearchType, number>>;
}

/** Debounce a fast-changing value. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

async function fetchSearch(q: string, type: SearchType): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>("/api/search", {
    params: { q, type },
  });
  return data;
}

export function useSearch(query: string, type: SearchType = "all", debounceMs = 300) {
  const debouncedQuery = useDebounced(query.trim(), debounceMs);
  const enabled = debouncedQuery.length > 0;

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["search", debouncedQuery, type],
    queryFn: () => fetchSearch(debouncedQuery, type),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000, // cache identical searches for a minute
  });

  return {
    results: data?.results ?? [],
    counts: data?.counts ?? {},
    // isLoading: first load for this key; isFetching: any in-flight (incl. refetch)
    isLoading: enabled && isLoading,
    isFetching: enabled && isFetching,
    isError,
    // True once the debounce settles and we've searched something
    hasSearched: enabled,
  };
}
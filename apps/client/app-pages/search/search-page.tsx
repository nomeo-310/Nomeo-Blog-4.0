"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch, type SearchResult } from "@/hooks/use-search";
import { authClient } from "@/lib/authClient";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { SearchHeader } from "./search-header";
import { SearchTrendingTopics } from "./search-trending-topics";
import { SearchResults } from "./search-results";
import type { FilterKey } from "./search-types";

/** Fetch top tags from the DB-cached endpoint */
async function fetchTrendingTags(): Promise<string[]> {
  const { data } = await api.get("/api/search/trending-tags");
  return data.tags ?? [];
}

/**
 * SearchPage — unified search over posts, writers, tags, and lounges.
 *
 * Owns all search state (query, filter, selection) and handlers; rendering
 * is delegated to sibling files in this folder (search-header,
 * search-trending-topics, search-results).
 */
export default function SearchPage() {
  const router  = useRouter();
  const { data: session } = authClient.useSession();
  const isSignedIn = !!session?.user;

  const [query,             setQuery]             = useState("");
  const [filter,            setFilter]            = useState<FilterKey>("all");
  const [selectedId,        setSelectedId]        = useState<string | null>(null);
  const [mobileShowPreview, setMobileShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = query.trim().length > 0;

  const { results, counts, isFetching, isError } = useSearch(query, filter);

  // Fetch trending tags — cached server-side for 10 min, re-fetched client-side every 10 min too
  const { data: trendingTags = [], isLoading: tagsLoading } = useQuery({
    queryKey:  ["trending-tags"],
    queryFn:   fetchTrendingTags,
    staleTime: 10 * 60 * 1000,  // match server-side TTL
    gcTime:    15 * 60 * 1000,
  });

  useEffect(() => { inputRef.current?.focus(); }, []);

  const activeItem = useMemo(
    () => results.find(item => item.id === selectedId) ?? null,
    [selectedId, results]
  );

  useEffect(() => {
    setSelectedId(null);
    setMobileShowPreview(false);
  }, [query, filter]);

  const handleItemClick = (id: string) => {
    if (selectedId === id) { setSelectedId(null); setMobileShowPreview(false); }
    else { setSelectedId(id); setMobileShowPreview(true); }
  };

  const navigateTo = (item: SearchResult) => router.push(item.href);

  const handleSubmit = () => {
    if (!isActive) return;
    router.push(`/search/results?q=${encodeURIComponent(query.trim())}&type=${filter}`);
  };

  return (
    <div className={cn(
      "relative w-full bg-background px-4 flex flex-col items-center",
      "min-h-[calc(100vh-var(--nav-h,4rem))]",
      isActive ? "justify-start pt-4 md:pt-8" : "justify-center pb-[10vh]",
      "transition-all duration-500 ease-out"
    )}>
      <div className="relative w-full max-w-7xl flex flex-col items-center gap-4 md:gap-5 transition-all duration-500 ease-out">

        <SearchHeader
          query={query}
          onQueryChange={setQuery}
          onClear={() => { setQuery(""); inputRef.current?.focus(); }}
          isActive={isActive}
          isFetching={isFetching}
          onSubmit={handleSubmit}
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          inputRef={inputRef}
        />

        <SearchTrendingTopics
          isActive={isActive}
          tagsLoading={tagsLoading}
          trendingTags={trendingTags}
          onTagSelect={(tag) => { setQuery(tag); setFilter("tag"); inputRef.current?.focus(); }}
        />

        {isActive && (
          <SearchResults
            isError={isError}
            isFetching={isFetching}
            results={results}
            query={query}
            filter={filter}
            selectedId={selectedId}
            mobileShowPreview={mobileShowPreview}
            activeItem={activeItem}
            isSignedIn={isSignedIn}
            onItemClick={handleItemClick}
            onNavigate={navigateTo}
            onBack={() => setMobileShowPreview(false)}
            onSignIn={() => router.push("/sign-in")}
          />
        )}

        {/* Footer hint */}
        {results.length > 0 && !mobileShowPreview && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground select-none">
            <span className="hidden md:inline">Click a result to preview</span>
            <span className="inline md:hidden">Tap a result to read more</span>
            <CornerDownLeft className="h-3 w-3 opacity-70 hidden md:inline" />
          </div>
        )}
      </div>
    </div>
  );
}

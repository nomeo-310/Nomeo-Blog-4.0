"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, User, Hash, ChevronRight, CornerDownLeft, X, ChevronLeft, ArrowUp, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch, type SearchType, type SearchResult } from "@/hooks/use-search";
import { ProfileConnectButton } from "@/components/ui/profile-connect-button";
import { authClient } from "@/lib/authClient";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

type FilterKey = SearchType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "All"     },
  { key: "story",  label: "Posts"   },
  { key: "author", label: "Writers" },
  { key: "tag",    label: "Tags"    },
  { key: "lounge", label: "Lounges" },
];

/** Fetch top tags from the DB-cached endpoint */
async function fetchTrendingTags(): Promise<string[]> {
  const { data } = await api.get("/api/search/trending-tags");
  return data.tags ?? [];
}

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

  const getIcon = (type: string, active: boolean) => {
    const cls = cn("h-4 w-4", active ? "text-current" : "text-muted-foreground");
    switch (type) {
      case "story":  return <FileText className={cls} />;
      case "author": return <User     className={cls} />;
      case "lounge": return <Users    className={cls} />;
      default:       return <Hash     className={cls} />;
    }
  };

  const ctaLabel = (type: string) => {
    switch (type) {
      case "story":  return "Read full story";
      case "author": return "View profile";
      case "lounge": return "Enter lounge";
      default:       return "Explore topic";
    }
  };

  return (
    <div className={cn(
      "relative w-full bg-background px-4 flex flex-col items-center",
      "min-h-[calc(100vh-var(--nav-h,4rem))]",
      isActive ? "justify-start pt-4 md:pt-8" : "justify-center pb-[10vh]",
      "transition-all duration-500 ease-out"
    )}>
      <div className="relative w-full max-w-7xl flex flex-col items-center gap-4 md:gap-5 transition-all duration-500 ease-out">

        {/* Heading — collapses when searching */}
        <div className={cn(
          "text-center select-none overflow-hidden transition-all duration-500 ease-out",
          isActive ? "max-h-0 opacity-0 mb-0" : "max-h-40 opacity-100 mb-1"
        )}>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">Nomeo</h1>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground">Search stories, writers, and topics.</p>
        </div>

        {/* Search box */}
        <div className="relative w-full max-w-3xl rounded-full bg-card border border-border shadow-sm transition-all focus-within:border-foreground/30">
          <div className="flex items-center px-4 py-2.5 md:px-5 md:py-3 gap-3">
            {isFetching
              ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0 animate-spin" />
              : <Search  className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && isActive && handleSubmit()}
              placeholder="Search stories, authors, or topics…"
              className="w-full bg-transparent border-0 outline-none text-sm md:text-lg text-card-foreground placeholder:text-muted-foreground/60"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                aria-label="Clear search"
                className="p-1 rounded-full hover:bg-accent text-muted-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={handleSubmit} disabled={!isActive} aria-label="Search"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                isActive ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95" : "bg-muted text-muted-foreground/50 cursor-not-allowed"
              )}>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        {isActive && (
          <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
            {FILTERS.map(f => {
              const on = filter === f.key;
              return (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs md:text-sm transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"
                  )}>
                  {f.label}
                  {f.key !== "all" && (
                    <span className={cn("text-[10px] tabular-nums", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {counts[f.key] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Popular topics (idle state) ─────────────────────────────── */}
        <div className={cn(
          "flex flex-col items-center gap-3 max-w-2xl overflow-hidden transition-all duration-500 ease-out",
          isActive ? "max-h-0 opacity-0" : "max-h-72 opacity-100"
        )}>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
            <Hash className="h-3.5 w-3.5" />
            <span>Popular topics</span>
          </div>

          {tagsLoading ? (
            /* Skeleton pills while fetching */
            <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}
                  className="h-7 rounded-full bg-muted animate-pulse"
                  style={{ width: `${60 + (i * 11) % 50}px` }}
                />
              ))}
            </div>
          ) : trendingTags.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-md md:max-w-none">
              {trendingTags.map(tag => (
                <button key={tag} type="button"
                  onClick={() => { setQuery(tag); setFilter("tag"); inputRef.current?.focus(); }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 md:px-3.5 md:py-1.5 text-xs md:text-sm text-foreground transition-colors hover:bg-accent hover:border-primary/30">
                  <Hash className="h-3 w-3 text-primary shrink-0" />
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            /* Fallback if no tags yet */
            <p className="text-xs text-muted-foreground">No topics yet — check back once posts are published.</p>
          )}
        </div>

        {/* Results */}
        {isActive && (
          <div className="w-full rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
            {isError ? (
              <div className="p-8 md:p-10 text-center">
                <p className="text-sm font-medium text-foreground">Search is unavailable right now.</p>
                <p className="text-xs text-muted-foreground mt-1">Please try again in a moment.</p>
              </div>
            ) : results.length === 0 && isFetching ? (
              <ResultsSkeleton />
            ) : results.length === 0 ? (
              <div className="p-8 md:p-10 text-center">
                <p className="text-sm font-medium text-foreground">No matches for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filter === "all"
                    ? "Try a tag like 'design' or a writer's name."
                    : "Nothing in this filter — try 'All' or another scope."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 h-auto min-h-[300px] max-h-[70vh] md:max-h-[480px] divide-y md:divide-y-0 md:divide-x divide-border relative">

                {/* ── Results list ── */}
                <div className={cn(
                  "overflow-y-auto p-2 custom-scrollbar flex flex-col gap-0.5 w-full h-full transition-all duration-300",
                  selectedId ? "md:col-span-6" : "md:col-span-12",
                  mobileShowPreview ? "hidden md:flex" : "flex"
                )}>
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-3 pt-2 pb-1.5 select-none">
                    {results.length} {results.length === 1 ? "result" : "results"}
                  </p>
                  {results.map(item => {
                    const active = selectedId === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => handleItemClick(item.id)}
                        className={cn(
                          "w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all group",
                          active ? "md:bg-primary md:text-primary-foreground bg-accent" : "hover:bg-accent text-card-foreground"
                        )}>
                        <div className={cn("p-2 rounded-lg shrink-0 transition-colors",
                          active ? "md:bg-white/15 bg-primary/10 text-primary md:text-inherit" : "bg-muted")}>
                          {getIcon(item.type, active)}
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-sm font-semibold truncate tracking-tight",
                              item.type === "tag" && "font-mono text-xs")}>
                              {item.type === "tag" && "#"}{item.title}
                            </span>
                            <span className={cn(
                              "text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded shrink-0 select-none",
                              active ? "md:bg-white/20 md:text-white bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {item.category}
                            </span>
                          </div>
                          <p className={cn("text-xs mt-0.5 truncate",
                            active ? "md:text-primary-foreground/80 text-muted-foreground" : "text-muted-foreground")}>
                            {item.subtitle}
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0 self-center transition-transform",
                          active ? "text-primary md:text-white rotate-90 md:rotate-0" : "text-muted-foreground/40 group-hover:translate-x-0.5"
                        )} />
                      </button>
                    );
                  })}
                </div>

                {/* ── Preview panel ── */}
                {activeItem && (
                  <div className={cn(
                    "md:col-span-6 bg-muted/20 p-4 md:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full w-full",
                    "animate-in fade-in md:slide-in-from-right-2 duration-200",
                    mobileShowPreview ? "flex" : "hidden md:flex"
                  )}>
                    {/* Mobile back */}
                    <button type="button" onClick={() => setMobileShowPreview(false)}
                      className="flex md:hidden items-center gap-1 text-xs font-semibold text-primary active:opacity-70">
                      <ChevronLeft className="h-4 w-4" /> Back to results
                    </button>

                    {/* Type badge */}
                    <div className="flex items-center gap-2 select-none">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {activeItem.type}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{activeItem.category}</span>
                    </div>

                    {/* ── Author-specific preview ── */}
                    {activeItem.type === "author" ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          {activeItem.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={activeItem.avatar} alt=""
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-border shrink-0" />
                          ) : (
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                              {activeItem.title.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading text-base font-bold text-card-foreground truncate">
                              {activeItem.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">{activeItem.subtitle}</p>
                          </div>
                        </div>

                        {activeItem.preview && (
                          <p className="text-xs md:text-sm text-card-foreground/90 leading-relaxed">
                            {activeItem.preview}
                          </p>
                        )}

                        <hr className="border-border" />

                        {isSignedIn && activeItem.userId ? (
                          <ProfileConnectButton
                            targetUserId={activeItem.userId}
                            targetIsCreator={activeItem.category === "Creator"}
                            className="w-full justify-center"
                          />
                        ) : !isSignedIn ? (
                          <button type="button" onClick={() => router.push("/sign-in")}
                            className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                            Sign in to follow
                          </button>
                        ) : null}

                        <button type="button" onClick={() => navigateTo(activeItem)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                          View full profile <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 gap-3">
                        <div>
                          <h3 className="text-base md:text-xl font-heading font-bold text-card-foreground tracking-tight leading-snug">
                            {activeItem.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">{activeItem.subtitle}</p>
                        </div>
                        <hr className="border-border" />
                        <p className="text-xs md:text-sm text-card-foreground/90 leading-relaxed whitespace-pre-line flex-1">
                          {activeItem.preview}
                        </p>
                        <button type="button" onClick={() => navigateTo(activeItem)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs md:text-sm font-semibold rounded-lg transition-all">
                          {ctaLabel(activeItem.type)} <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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

/* ── Loading skeleton ───────────────────────────────────────────────────── */

function ResultsSkeleton() {
  return (
    <div className="p-2" aria-busy="true" aria-label="Loading results">
      <div className="px-3 pt-2 pb-1.5">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${55 + ((i * 7) % 30)}%` }} />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${35 + ((i * 5) % 25)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
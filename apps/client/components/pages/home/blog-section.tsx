"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Clock, Eye, Lock, PenLine, ChevronLeft, ChevronRight,
  Flame, Search, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaginationWithInfo } from "@/components/ui/pagination";

/**
 * BlogSection — client component for the blog discovery section.
 *
 * Handles search, category filter, sort, and pagination entirely on the
 * client side via URL search params. When params change:
 *   1. URL is updated (pushState — no full page reload, hero stays put)
 *   2. The section scrolls into view so the user sees the results
 *   3. The grid fetches new results via the server action / API
 *
 * This fixes two problems:
 *   a) Page was jumping to top on search (full navigation)
 *   b) No-results state was broken (placeholders shown regardless)
 *
 * Responsive page size — NEW:
 *   Items per page now match how many cards actually fit in two rows of
 *   the grid at the current breakpoint: 4 on mobile/tablet (2×2), 6 on
 *   large screens (3×2), 8 on 2xl (4×2). The server has no way to know
 *   the viewport, so `pageSize` (passed in as `initialPageSize`) is only
 *   a best-effort guess used for the first paint. `useResponsivePageSize`
 *   resolves the real value on mount and whenever the breakpoint changes,
 *   and the section refetches page 1 at the corrected size when it does.
 *
 *   NOTE: this sends a `limit` query param to `/api/posts/search`. That
 *   route isn't in this file — make sure it reads `limit` and uses it for
 *   the Mongo skip/limit instead of a hardcoded page size, or pagination
 *   will silently keep returning a fixed number of items regardless of
 *   breakpoint.
 */

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: { secureUrl: string; publicId: string } | null;
  tags: string[];
  category: string;
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  publishedAt: string | null;
  author: { name: string; username: string; avatar: string };
};

interface BlogSectionProps {
  // Initial data from server — avoids a loading flash on first render
  initialPosts:      Post[];
  initialTotal:      number;
  initialCategories: string[];
  initialQuery:      string;
  initialCategory:   string;
  initialSort:       string;
  initialPage:       number;
  // Best-effort page size used for the SSR fetch (server can't see the
  // viewport). The client resolves the real value on mount — see
  // useResponsivePageSize below.
  pageSize:          number;
}

// Tailwind's default `lg` and `2xl` breakpoints — keep these in sync with
// the grid-cols-* classes on the results grid below.
const LG_BREAKPOINT  = 1024;
const XL2_BREAKPOINT = 1536;

function getResponsivePageSize(width: number): number {
  if (width >= XL2_BREAKPOINT) return 8; // 2xl: 4 cols × 2 rows
  if (width >= LG_BREAKPOINT)  return 6; // lg/xl: 3 cols × 2 rows
  return 4;                              // mobile/tablet: 2 cols × 2 rows
}

/**
 * Resolves the correct items-per-page for the current viewport, starting
 * from the server's best guess and correcting once we're on the client.
 * Re-syncs on resize (debounced) so crossing a breakpoint updates it live.
 */
function useResponsivePageSize(initialPageSize: number) {
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const sync = () => {
      const next = getResponsivePageSize(window.innerWidth);
      setPageSize((prev) => (prev === next ? prev : next));
    };

    // Resolve immediately on mount — the SSR guess may be wrong.
    sync();

    const onResize = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(sync, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (debounceId) clearTimeout(debounceId);
    };
  }, []);

  return pageSize;
}

export function BlogSection({
  initialPosts, initialTotal, initialCategories,
  initialQuery, initialCategory, initialSort, initialPage,
  pageSize: initialPageSize,
}: BlogSectionProps) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const sectionRef  = useRef<HTMLElement>(null);
  const [isPending, startTransition] = useTransition();

  // Local state mirrors URL params
  const [query,    setQuery]    = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort,     setSort]     = useState(initialSort);
  const [page,     setPage]     = useState(initialPage);

  // Items per page — resolves to the real breakpoint-based value on mount
  const pageSize = useResponsivePageSize(initialPageSize);
  const lastFetchedPageSize = useRef(initialPageSize);

  // Results state — start with server-rendered data
  const [posts,      setPosts]      = useState<Post[]>(initialPosts);
  const [total,      setTotal]      = useState(initialTotal);
  const [categories, setCategories] = useState(initialCategories);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false); // has user interacted?

  // Debounce ref for search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch results from the API ────────────────────────────────────────
  const fetchResults = useCallback(async (
    q: string, cat: string, s: string, p: number, scrollToSection = true, limit: number = pageSize
  ) => {
    setLoading(true);

    // Update URL without navigation (no page reload, hero stays).
    // `limit` is a responsive/derived value, not user-chosen, so it's
    // deliberately left out of the URL.
    const sp = new URLSearchParams();
    if (q)           sp.set("q",    q);
    if (cat)         sp.set("cat",  cat);
    if (s !== "newest") sp.set("sort", s);
    if (p > 1)       sp.set("page", String(p));
    const newUrl = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
    window.history.pushState(null, "", newUrl);

    try {
      const params = new URLSearchParams({ q, cat, sort: s, page: String(p), limit: String(limit) });
      const res  = await fetch(`/api/posts/search?${params.toString()}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
      if (data.categories) setCategories(data.categories);
    } catch {
      // silently keep existing results on error
    } finally {
      setLoading(false);
    }

    // Scroll section into view after results load
    if (scrollToSection) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [pathname, pageSize]);

  // ── Refetch page 1 whenever the responsive page size actually changes
  //    (i.e. the viewport crossed a breakpoint, or the client corrected
  //    the server's first-paint guess) ───────────────────────────────────
  useEffect(() => {
    if (lastFetchedPageSize.current === pageSize) return;
    lastFetchedPageSize.current = pageSize;
    setPage(1);
    fetchResults(query, category, sort, 1, false, pageSize);
    // query/category/sort intentionally omitted — this effect should only
    // react to breakpoint changes, not re-run when the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, fetchResults]);

  // ── Search input handler (debounced 400ms) ────────────────────────────
  const handleSearch = (value: string) => {
    setQuery(value);
    setSearched(true);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value, category, sort, 1);
    }, 400);
  };

  // ── Category / sort handlers (immediate) ─────────────────────────────
  const handleCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
    setSearched(true);
    fetchResults(query, cat, sort, 1);
  };

  const handleSort = (s: string) => {
    setSort(s);
    setPage(1);
    setSearched(true);
    fetchResults(query, category, s, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchResults(query, category, sort, p);
  };

  const clearSearch = () => {
    setQuery("");
    setPage(1);
    setSearched(false);
    fetchResults("", category, sort, 1, false);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasResults = posts.length > 0;
  const noResults  = searched && !loading && !hasResults;

  return (
    <section ref={sectionRef} className="w-full scroll-mt-4 px-4 pt-12 md:px-0">

      {/* ── Section header + search ──────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Blog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stories, ideas, and perspectives from Nomeo writers.
          </p>
        </div>

        {/* Search input — client-side, no form submission */}
        <div className="relative w-full sm:w-80">
          <div className={cn(
            "flex h-10 items-center gap-2 rounded-full border bg-card px-4 shadow-sm transition-colors",
            loading ? "border-primary/40" : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          )}>
            {loading
              ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search title, tag, author…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {query && (
              <button onClick={clearSearch} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill label="All"  active={!category} onClick={() => handleCategory("")} />
          {categories.map((cat) => (
            <FilterPill key={cat} label={cat} active={category === cat} onClick={() => handleCategory(cat)} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
          <button
            onClick={() => handleSort("newest")}
            className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              sort === "newest" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            Newest
          </button>
          <button
            onClick={() => handleSort("trending")}
            className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              sort === "trending" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <Flame className="h-3 w-3" /> Trending
          </button>
        </div>
      </div>

      {/* Active query label */}
      {query && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Results for <span className="font-semibold text-foreground">"{query}"</span></span>
          <button onClick={clearSearch} className="font-semibold text-primary hover:underline">Clear</button>
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────────
            Columns are tied to the same breakpoints as the responsive page
            size above, so a "page" always fills exactly two full rows:
              < lg  (mobile/tablet) → 2 cols × 2 rows = 4 items
              lg/xl (large)         → 3 cols × 2 rows = 6 items
              2xl                   → 4 cols × 2 rows = 8 items
      ──────────────────────────────────────────────────────────────────── */}
      <div className={cn("mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
        loading && "opacity-60 transition-opacity")}>
        {loading && !hasResults
          ? Array.from({ length: pageSize }).map((_, i) => <PostCardPlaceholder key={i} />)
          : hasResults
          ? posts.map((post) => <PostCard key={post.id} post={post} />)
          : !searched
          // initial empty DB state — show placeholders
          ? Array.from({ length: pageSize }).map((_, i) => <PostCardPlaceholder key={i} />)
          : null
        }
      </div>

      {/* No results message */}
      {noResults && (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30" />
          <h3 className="mt-4 font-heading text-base font-bold text-foreground">
            {query
              ? `No posts match "${query}"`
              : category
              ? `No posts in "${category}" yet`
              : "No posts yet"}
          </h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {query
              ? "Try a different title, tag, or author name."
              : "Check back soon or explore a different category."}
          </p>
          {(query || category) && (
            <button
              onClick={() => { setQuery(""); setCategory(""); fetchResults("", "", sort, 1, false); }}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && hasResults && (
        <div className="mt-12">
          <PaginationWithInfo
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={handlePage}
            variant="primary"
            maxVisiblePages={5}
            showPageNumbers={true}
            showInfo={true}
          />
        </div>
      )}
    </section>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-foreground text-background"
          : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <Link href={`/post/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {post.coverImage?.secureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage.secureUrl} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <PenLine className="h-8 w-8 text-primary/20" />
          </div>
        )}
        {(post.category || post.tags[0]) && (
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            {post.category || post.tags[0]}
          </span>
        )}
        {post.access === "paid" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Lock className="h-3 w-3" /> Members
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readingTime && (
            <><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readingTime} mins</span></>
          )}
          {!post.readingTime && post.viewsCount > 0 && (
            <><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(post.viewsCount)}</span></>
          )}
        </div>
        <Link href={`/post/${post.slug}`} className="mt-2 block">
          <h3 className="line-clamp-2 font-heading text-base font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto pt-4">
          <Link href={post.author.username ? `/profile/${post.author.username}` : "#"}
            className="flex items-center gap-2.5 group/author">
            {post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {post.author.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-semibold text-foreground group-hover/author:text-primary">
              {post.author.name}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function PostCardPlaceholder() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col space-y-3 p-5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-1 w-1 rounded-full bg-muted" />
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-muted" />
        <div className="mt-auto flex items-center gap-2 pt-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
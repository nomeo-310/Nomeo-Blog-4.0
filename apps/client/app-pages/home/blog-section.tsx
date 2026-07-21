"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BlogSearchHeader, BlogActiveQueryLabel } from "./blog-search-header";
import { BlogFilterBar } from "./blog-filter-bar";
import { BlogGrid } from "./blog-grid";
import { BlogPagination } from "./blog-pagination";
import type { Post } from "./blog-types";

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
 *
 * Layout is composed from sibling sub-components in this same folder
 * (blog-search-header, blog-filter-bar, blog-grid, blog-pagination); this
 * file owns all state and handlers, passed down as props.
 */

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
// the grid-cols-* classes on the results grid (blog-grid.tsx).
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

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    fetchResults("", "", sort, 1, false);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasResults = posts.length > 0;
  const noResults  = searched && !loading && !hasResults;

  return (
    <section ref={sectionRef} className="w-full scroll-mt-4 px-4 pt-12 md:px-0">

      <BlogSearchHeader query={query} loading={loading} onSearch={handleSearch} onClear={clearSearch} />

      <BlogFilterBar
        categories={categories}
        category={category}
        sort={sort}
        onCategory={handleCategory}
        onSort={handleSort}
      />

      <BlogActiveQueryLabel query={query} onClear={clearSearch} />

      <BlogGrid
        posts={posts}
        loading={loading}
        hasResults={hasResults}
        searched={searched}
        noResults={noResults}
        query={query}
        category={category}
        page={page}
        pageSize={pageSize}
        onClearFilters={clearFilters}
      />

      <BlogPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        hasResults={hasResults}
        onPageChange={handlePage}
      />
    </section>
  );
}

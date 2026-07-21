import Link from "next/link";
import { Clock03Icon, ViewIcon, CircleLock02Icon, Edit01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { AdvertCard } from "@/components/features/advert-slot";
import type { Post } from "./blog-types";

/**
 * Results grid — post cards, loading placeholders, native ad splice-in,
 * and the "no results" empty state.
 *
 * Columns are tied to the same breakpoints as the responsive page size
 * resolved in blog-section.tsx, so a "page" always fills exactly two full
 * rows:
 *   < lg  (mobile/tablet) → 2 cols × 2 rows = 4 items
 *   lg/xl (large)         → 3 cols × 2 rows = 6 items
 *   2xl                   → 4 cols × 2 rows = 8 items
 */
export function BlogGrid({
  posts, loading, hasResults, searched, noResults, query, category, page, pageSize, onClearFilters,
}: {
  posts: Post[];
  loading: boolean;
  hasResults: boolean;
  searched: boolean;
  noResults: boolean;
  query: string;
  category: string;
  page: number;
  pageSize: number;
  onClearFilters: () => void;
}) {
  return (
    <>
      <div className={cn("mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
        loading && "opacity-60 transition-opacity")}>
        {loading && !hasResults
          ? Array.from({ length: pageSize }).map((_, i) => <PostCardPlaceholder key={i} />)
          : hasResults
          ? posts.flatMap((post, i) => {
              const card = <PostCard key={post.id} post={post} />;
              // One native ad card, third slot, first page only, no active
              // search/filter — keeps organic content the overwhelming majority.
              if (i === 2 && page === 1 && !query && !category) {
                return [card, <AdvertCard key="advert-slot" placement="feed_card" />];
              }
              return [card];
            })
          : !searched
          // initial empty DB state — show placeholders
          ? Array.from({ length: pageSize }).map((_, i) => <PostCardPlaceholder key={i} />)
          : null
        }
      </div>

      {/* No results message */}
      {noResults && (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <HugeiconsIcon icon={Search01Icon} className="h-8 w-8 text-muted-foreground/30" />
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
              onClick={onClearFilters}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

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
            <HugeiconsIcon icon={Edit01Icon} className="h-8 w-8 text-primary/20" />
          </div>
        )}
        {(post.category || post.tags[0]) && (
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            {post.category || post.tags[0]}
          </span>
        )}
        {post.access === "paid" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <HugeiconsIcon icon={CircleLock02Icon} className="h-4 w-4" /> Members
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readingTime && (
            <><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><HugeiconsIcon icon={Clock03Icon} className="h-3 w-3" />{post.readingTime} mins</span></>
          )}
          {!post.readingTime && post.viewsCount > 0 && (
            <><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><HugeiconsIcon icon={ViewIcon} className="h-3 w-3" />{formatCount(post.viewsCount)}</span></>
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

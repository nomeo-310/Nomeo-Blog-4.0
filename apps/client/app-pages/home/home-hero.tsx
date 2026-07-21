import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock03Icon, ViewIcon, CircleLock02Icon, Edit01Icon, ArrowRight02Icon, Message01Icon, FavouriteIcon, Bookmark01Icon } from "@hugeicons/core-free-icons";
import type { HomePost } from "./home-types";

/* ── Hero ───────────────────────────────────────────────────────────────── */

export function HeroPost({ post }: { post: HomePost }) {
  return (
    <section className="relative mt-6 h-[86vh] min-h-[500px] w-full overflow-hidden rounded-2xl bg-muted ">
      {/* Cover image */}
      {post.coverImage?.secureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage.secureUrl}
          alt=""
          loading="eager"
          className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <HugeiconsIcon icon={Edit01Icon} className="h-16 w-16 text-primary/20" />
        </div>
      )}

      {/* Full overlay — subtle dark tint over the entire image */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Bottom panel — solid frosted dark area, works on ANY image brightness */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pb-8 pt-32 sm:pb-10 sm:pt-40" />

      {/* ── Top-left: category badge ── */}
      {(post.category || post.tags[0]) && (
        <div className="absolute left-5 top-5">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur-md">
            {post.category || post.tags[0]}
          </span>
        </div>
      )}

      {/* ── Top-right: author chip ── */}
      {post.author && (
        <div className="absolute right-5 top-5">
          <Link
            href={post.author.username ? `/profile/${post.author.username}` : "#"}
            className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-black/75"
          >
            {post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                {post.author.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-medium text-white">{post.author.name}</span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="h-3 w-3 text-white/60" />
          </Link>
        </div>
      )}

      {/* ── Bottom content ── */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-white sm:px-8 sm:pb-10">
        <div className="mx-auto max-w-7xl">

          {/* Title */}
          <Link href={`/post/${post.slug}`} className="group block">
            <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight drop-shadow-sm transition-colors group-hover:text-white/85 sm:text-4xl md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
          </Link>

          {post.excerpt && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {post.excerpt}
            </p>
          )}

          {/* Meta row — date + reading time + stats */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 sm:text-sm">
            {/* Date */}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Clock03Icon} className="h-3.5 w-3.5" />
                {formatDate(post.publishedAt)}
              </span>
            )}
            {post.readingTime && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>{post.readingTime} min read</span>
              </>
            )}

            {/* Divider */}
            <span className="h-1 w-1 rounded-full bg-white/30" />

            {/* Stats — views, likes, comments, saves */}
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={ViewIcon} className="h-3.5 w-3.5" />
              {formatCount(post.viewsCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={FavouriteIcon} className="h-3.5 w-3.5" />
              {formatCount(post.likesCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Message01Icon} className="h-3.5 w-3.5" />
              {formatCount(post.commentsCount)}
            </span>
            {post.savesCount > 0 && (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Bookmark01Icon} className="h-3.5 w-3.5" />
                {formatCount(post.savesCount)}
              </span>
            )}

            {post.access === "paid" && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3" /> Members
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function EmptyHero({ user }: { user?: any }) {
  return (
    <div className="relative mt-6 flex h-[70vh] min-h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl bg-primary/20 lg:min-h-[550px] xl:min-h-[650px]">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl" style={{ animationDelay: "1s" }} />
      </div>
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <HugeiconsIcon icon={Edit01Icon} className="h-12 w-12 text-primary/60" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">Welcome to Nomeo</p>
        <h1 className="mt-4 font-heading text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
          Stories worth reading.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          The first published post will appear here. Start your writing journey today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user?.role === "creator" && (
            <Link href="/dashboard/posts/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" /> Write your first story
            </Link>
          )}
          <Link href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent">
            Learn more <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
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

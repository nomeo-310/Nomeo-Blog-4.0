"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock03Icon, ViewIcon, CircleLock02Icon, Edit01Icon, ArrowRight02Icon, Message01Icon, FavouriteIcon, Bookmark01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { EmptyHero } from "./home-hero";
import type { HeroSlide } from "./home-types";

const AUTO_ADVANCE_MS = 7000;

/**
 * HeroCarousel — the home page's top slot. Slides are resolved server-side
 * (home-page.tsx's HomePage: promoted posts pinned first, trending posts
 * filling the rest up to HERO_LIMIT) — same footprint as the single-post
 * hero it replaced (h-[86vh] min-h-[500px] rounded-2xl), just a carousel
 * inside it. Hero is reserved for real posts — every slide is a normal post
 * card visually; `promotedAdvertId` (set when an admin promoted that post
 * into the slot) only changes the badge and adds tracking, never the link
 * target or layout.
 *
 * Impression tracking for a promoted slide fires client-side, once, the
 * moment it actually becomes the active slide (not just on page load) —
 * slide selection happens on the server, but "was this shown to the
 * viewer" is inherently a client concern, same as every other placement.
 */
export function HeroCarousel({ slides, user }: { slides: HeroSlide[]; user?: any }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const firedImpressions = useRef<Set<string>>(new Set());

  const current = slides[index] as HeroSlide | undefined;

  useEffect(() => {
    const advertId = current?.promotedAdvertId;
    if (!advertId || firedImpressions.current.has(advertId)) return;
    firedImpressions.current.add(advertId);
    api.post(`/api/adverts/${advertId}/impression`).catch(() => {});
  }, [current]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) return <EmptyHero user={user} />;

  return (
    <div
      className="relative mt-6 h-[86vh] min-h-[500px] w-full overflow-hidden rounded-2xl bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.post.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={i !== index}
        >
          <HeroPostSlide slide={slide} />
        </div>
      ))}

      {/* Single-slide carousels (e.g. only one post live at all, or exactly
          one promoted with no trending fill yet) show no dots — they'd just
          be a lonely, unclickable dot. */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.post.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1} of ${slides.length}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroPostSlide({ slide }: { slide: HeroSlide }) {
  const { post, promotedAdvertId } = slide;

  const trackClick = () => {
    if (!promotedAdvertId) return;
    api.post(`/api/adverts/${promotedAdvertId}/click`).catch(() => {});
  };

  return (
    <div className="relative h-full w-full">
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

      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pb-8 pt-32 sm:pb-10 sm:pt-40" />

      {/* Top-left: "Promoted" badge (only for an admin-promoted slide), then category */}
      <div className="absolute left-5 top-5 flex items-center gap-2">
        {promotedAdvertId && (
          <span className="rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur-md">
            Promoted
          </span>
        )}
        {(post.category || post.tags[0]) && (
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur-md">
            {post.category || post.tags[0]}
          </span>
        )}
      </div>

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

      <div className="absolute inset-x-0 bottom-0 px-5 pb-14 text-white sm:px-8 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <Link href={`/post/${post.slug}`} onClick={trackClick} className="group block">
            <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight drop-shadow-sm transition-colors group-hover:text-white/85 sm:text-4xl md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
          </Link>

          {post.excerpt && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {post.excerpt}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 sm:text-sm">
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

            <span className="h-1 w-1 rounded-full bg-white/30" />

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
    </div>
  );
}

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

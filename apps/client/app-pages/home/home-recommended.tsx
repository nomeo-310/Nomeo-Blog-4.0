import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, Message01Icon, ViewIcon, Bookmark01Icon, Sparkles } from "@hugeicons/core-free-icons";
import type { HomePost } from "./home-types";

/**
 * "Recommended for you" — a short list of posts matching the signed-in
 * reader's onboarding interests (Profile.interests, matched against
 * Post.tags once normalized through the Topic vocabulary — see
 * services/topic-services.ts). Renders nothing for guests or readers with
 * no interest match yet, so it never shows an awkward empty section.
 *
 * Row styling deliberately mirrors RelatedPostCard (app-pages/post/post-related.tsx)
 * rather than the boxed grid cards below it — a borderless list reads better
 * for a short, personal rail than another wall of cards.
 */
export function HomeRecommended({ posts }: { posts: HomePost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16 px-4 md:px-0">
      <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
        <HugeiconsIcon icon={Sparkles} className="h-5 w-5 text-primary" />
        Recommended for you
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Based on the topics you follow.</p>

      <div className="mt-2">
        {posts.map((post, i) => (
          <div key={post.id}>
            <RecommendedRow post={post} />
            {i < posts.length - 1 && <div className="border-t border-border" />}
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendedRow({ post }: { post: HomePost }) {
  return (
    <Link href={`/post/${post.slug}`} className="group flex items-start gap-4 py-5 transition-colors">
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {post.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {post.author.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-medium text-foreground">{post.author.name}</span>
          {post.publishedAt && <span>· {formatDate(post.publishedAt)}</span>}
        </div>

        <h3 className="font-heading text-base font-bold leading-snug text-foreground group-hover:text-primary line-clamp-2">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {post.category && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {post.category}
            </span>
          )}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={FavouriteIcon} className="h-3.5 w-3.5" />{formatCount(post.likesCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={Message01Icon} className="h-3.5 w-3.5" />{formatCount(post.commentsCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={ViewIcon} className="h-3.5 w-3.5" />{formatCount(post.viewsCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={Bookmark01Icon} className="h-3.5 w-3.5" />{formatCount(post.savesCount)}
            </span>
          </div>
        </div>
      </div>

      {/* Cover image — flush right, no card treatment */}
      {post.coverImage?.secureUrl && (
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage.secureUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </Link>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock03Icon, ViewIcon, CircleLock02Icon, BookOpen01Icon, ArrowRight01Icon, ArrowLeft01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import { formatDate, formatCount } from "./post-format";
import type { FullPost, PostAuthor, PostSeries } from "./post-types";

/** Series nav, tags, title, excerpt, and the byline/stats meta row. */
export function PostHeader({ post }: { post: FullPost }) {
  return (
    <>
      {post.series && <SeriesNav series={post.series} />}

      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
        {post.title}
      </h1>

      {post.excerpt && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        {/* Avatar stack — industry style overlapping avatars, no names */}
        <AvatarStack author={post.author} coAuthors={post.coAuthors} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readingTime && (
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={Clock03Icon} className="h-3.5 w-3.5" />{post.readingTime} min read
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={ViewIcon} className="h-3.5 w-3.5" />{formatCount(post.viewsCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={Message01Icon} className="h-3.5 w-3.5" />{formatCount(post.commentsCount)}
          </span>
          {post.access === "paid" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3" /> Members
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function SeriesNav({ series }: { series: PostSeries }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        <HugeiconsIcon icon={BookOpen01Icon} className="mr-1 inline h-3.5 w-3.5" />
        Series · {series.title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-4">
        {series.prev ? (
          <Link href={`/post/${series.prev.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{series.prev.title}</span>
          </Link>
        ) : <span />}
        {series.next && (
          <Link href={`/post/${series.next.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <span className="line-clamp-1">{series.next.title}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * AvatarStack — overlapping avatars for author + co-authors.
 * Industry standard (GitHub, Figma, Notion): each avatar overlaps the
 * previous by ~8px with a ring so they separate visually.
 * Shows max 4, then a +N overflow badge.
 */
function AvatarStack({ author, coAuthors }: {
  author: PostAuthor;
  coAuthors: PostAuthor[];
}) {
  const all = [author, ...coAuthors];
  const MAX = 4;
  const visible = all.slice(0, MAX);
  const overflow = all.length - MAX;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((person, i) => {
          const href = person.username ? `/profile/${person.username}` : "#";
          return (
            <Link
              key={person.id}
              href={href}
              title={`${person.name}${i === 0 ? " (author)" : " (co-author)"}`}
              style={{ zIndex: visible.length - i }}
              className="relative rounded-full ring-2 ring-card transition-transform hover:z-10 hover:scale-110"
            >
              {person.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatar} alt={person.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {person.name.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          );
        })}
        {overflow > 0 && (
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-2 ring-card">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}

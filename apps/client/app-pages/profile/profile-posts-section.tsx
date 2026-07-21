import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, ViewIcon, CircleLock02Icon, Sparkles } from "@hugeicons/core-free-icons";
import { formatDate, formatCount } from "./profile-format";
import type { ProfilePost } from "./profile-types";

/** Reusable 4-cap post grid with a "View more" link — used for Writing/Liked/Saved. */
export function PostsSection({
  title, icon, posts, totalCount, viewMoreHref, viewMoreLabel,
  emptyIcon, emptyTitle, emptyDesc, mt = true,
}: {
  title: string;
  icon: React.ReactNode;
  posts: ProfilePost[];
  totalCount?: number;
  viewMoreHref: string;
  viewMoreLabel: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDesc: string;
  mt?: boolean;
}) {
  // We fetch 5 to detect hasMore — display only first 4
  const hasMore  = posts.length > 4;
  const visible  = posts.slice(0, 4);
  const count    = totalCount ?? posts.length;

  return (
    <div className={mt ? "mt-10" : undefined}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
          {count > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({count})</span>
          )}
        </h2>
        {hasMore && (
          <Link
            href={viewMoreHref}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {viewMoreLabel} →
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          {emptyIcon}
          <p className="mt-3 text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDesc}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(post => <ProfilePostCard key={post.id} post={post} />)}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <Link
                href={viewMoreHref}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                {viewMoreLabel}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProfilePostCard({ post }: { post: ProfilePost }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <Link href={`/post/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <HugeiconsIcon icon={Edit01Icon} className="h-8 w-8 text-primary/30" />
          </div>
        )}
        {post.access === "paid" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3 text-primary" /> Members
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">#{tag}</span>
            ))}
          </div>
        )}
        <Link href={`/post/${post.slug}`}>
          <h3 className="line-clamp-2 font-heading text-base font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readingTime && (
            <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Sparkles} className="h-3 w-3" />{post.readingTime} min</span>
          )}
          <span className="ml-auto inline-flex items-center gap-1"><HugeiconsIcon icon={ViewIcon} className="h-3 w-3" />{formatCount(post.viewsCount)}</span>
        </div>
      </div>
    </article>
  );
}

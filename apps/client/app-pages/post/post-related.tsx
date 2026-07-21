import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, Message01Icon, ViewIcon, Bookmark01Icon } from "@hugeicons/core-free-icons";
import { formatDate, formatCount } from "./post-format";
import type { RelatedPost } from "./post-types";

/** "Related posts" list — shown below the article when there are matches. */
export function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  return (
    <div className="mt-12">
      <h2 className="font-heading text-xl font-bold text-foreground">Related posts</h2>
      <div className="mt-4">
        {posts.map((post, i) => (
          <div key={post.id}>
            <RelatedPostCard post={post} />
            {/* Divider between items — not after the last one */}
            {i < posts.length - 1 && (
              <div className="border-t border-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link
      href={`/post/${post.slug}`}
      className="group flex items-start gap-4 py-5 transition-colors"
    >
      {/* Text content */}
      <div className="min-w-0 flex-1">
        {/* Author row */}
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
          {post.author.username && <span>· @{post.author.username}</span>}
          {post.publishedAt && <span>· {formatDate(post.publishedAt)}</span>}
        </div>

        {/* Title */}
        <h3 className="font-heading text-base font-bold leading-snug text-foreground group-hover:text-primary line-clamp-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        {/* Footer: category + stats */}
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
      {post.coverImage && (
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </Link>
  );
}

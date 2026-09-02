import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircle02Icon } from "@hugeicons/core-free-icons";
import type { TopWriter, TopWriterPost } from "@/lib/get-top-writers";

/** One writer's card on the /writers directory — profile summary plus their paid and free posts, categorized. */
export function WriterCard({ writer }: { writer: TopWriter }) {
  const initials = (writer.displayName || writer.username).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:gap-6">
      {/* Profile summary */}
      <Link href={`/profile/${writer.username}`} className="flex shrink-0 flex-row items-center gap-3 sm:w-48 sm:flex-col sm:items-start sm:text-left">
        {writer.avatar ? (
          <Image
            src={writer.avatar}
            alt={writer.displayName || writer.username}
            width={56} height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary ring-2 ring-border">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-bold text-foreground hover:text-primary">
            {writer.displayName || writer.username}
          </p>
          <p className="truncate text-xs text-muted-foreground">@{writer.username}</p>
          <p className="mt-1 text-xs font-semibold text-primary">{formatFollowers(writer.followersCount)}</p>
        </div>
      </Link>

      {writer.bio && (
        <p className="hidden max-w-xs shrink-0 text-xs leading-relaxed text-muted-foreground sm:block">{writer.bio}</p>
      )}

      {/* Paid / free post lists */}
      <div className="grid flex-1 gap-5 sm:grid-cols-2">
        <PostList
          label="Paid"
          posts={writer.paidPosts}
          totalCount={writer.paidPostsCount}
          username={writer.username}
          emptyLabel="No paid posts yet"
        />
        <PostList
          label="Free"
          posts={writer.freePosts}
          totalCount={writer.freePostsCount}
          username={writer.username}
          emptyLabel="No free posts yet"
        />
      </div>
    </div>
  );
}

function PostList({ label, posts, totalCount, username, emptyLabel }: {
  label: string;
  posts: TopWriterPost[];
  totalCount: number;
  username: string;
  emptyLabel: string;
}) {
  return (
    <div>
      <span className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
        (label === "Paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
      }>
        {label}
      </span>
      {posts.length === 0 ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground/60 italic">
          <HugeiconsIcon icon={UserCircle02Icon} className="h-3.5 w-3.5" /> {emptyLabel}
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/post/${p.slug}`} className="line-clamp-1 text-sm text-foreground hover:text-primary hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalCount > posts.length && (
        <Link href={`/profile/${username}`} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
          View all {totalCount} →
        </Link>
      )}
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} ${n === 1 ? "follower" : "followers"}`;
}

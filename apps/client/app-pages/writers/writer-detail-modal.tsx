"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd02Icon, ArrowRight02Icon, Clock03Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/ui/modal";
import type { TopWriter } from "@/lib/get-top-writers";
import type { WriterPosts, WriterPostDetail } from "@/lib/get-writer-posts";

/**
 * WriterDetailModal — the "view details" destination from a flip card on
 * /writers. Fetches the writer's full paid/free post lists on demand
 * (the grid only ever carried a short preview) and links straight into
 * each post and the writer's full profile.
 */
export function WriterDetailModal({ writer, onClose }: { writer: TopWriter | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<WriterPosts>({
    queryKey: ["writer-posts", writer?.username],
    queryFn: () => api.get(`/api/writers/${writer!.username}/posts`).then((r) => r.data),
    enabled: !!writer,
    staleTime: 5 * 60 * 1000,
  });

  const initials = writer ? (writer.displayName || writer.username).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "";

  return (
    <Modal isOpen={!!writer} onClose={onClose} size="xl">
      {writer && (
        <div className="flex min-h-[55vh] flex-col">
          {/* ── Profile header ── */}
          <div className="relative -m-5 mb-0 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-6 pt-8 sm:px-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
              <div className="rounded-full bg-gradient-to-br from-primary/50 via-primary/15 to-transparent p-1">
                {writer.avatar ? (
                  <Image src={writer.avatar} alt={writer.displayName || writer.username} width={88} height={88} className="h-[88px] w-[88px] rounded-full object-cover ring-4 ring-background" />
                ) : (
                  <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-primary/10 font-heading text-3xl font-bold text-primary ring-4 ring-background">
                    {initials}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-heading text-2xl font-bold text-foreground">{writer.displayName || writer.username}</h2>
                <p className="text-sm text-muted-foreground">@{writer.username}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                    <HugeiconsIcon icon={UserAdd02Icon} className="h-3.5 w-3.5 text-primary" /> {formatFollowers(writer.followersCount)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                    <HugeiconsIcon icon={BookOpen01Icon} className="h-3.5 w-3.5 text-primary" /> {writer.paidPostsCount + writer.freePostsCount} posts
                  </span>
                </div>
              </div>
              <Link
                href={`/profile/${writer.username}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                Full profile <HugeiconsIcon icon={ArrowRight02Icon} className="h-3.5 w-3.5" />
              </Link>
            </div>
            {writer.bio && (
              <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{writer.bio}</p>
            )}
          </div>

          {/* ── Paid / free post lists ── */}
          {!isLoading && data && data.paidPosts.length === 0 && data.freePosts.length === 0 ? (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={BookOpen01Icon} className="h-6 w-6 text-muted-foreground/50" />
              </span>
              <p className="text-sm font-medium text-muted-foreground">No posts created yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid flex-1 gap-6 md:grid-cols-2">
              <PostColumn label="Paid posts" accent posts={data?.paidPosts} isLoading={isLoading} emptyLabel="No paid posts yet." />
              <PostColumn label="Free posts" posts={data?.freePosts} isLoading={isLoading} emptyLabel="No free posts yet." />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PostColumn({ label, accent, posts, isLoading, emptyLabel }: {
  label: string;
  accent?: boolean;
  posts?: WriterPostDetail[];
  isLoading: boolean;
  emptyLabel: string;
}) {
  return (
    <div>
      <span className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide " +
        (accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
      }>
        {label}
      </span>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : !posts || posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          posts.map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              {p.coverImage ? (
                <Image src={p.coverImage} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <HugeiconsIcon icon={BookOpen01Icon} className="h-5 w-5 text-muted-foreground/50" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">{p.title}</p>
                {p.readingTime && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <HugeiconsIcon icon={Clock03Icon} className="h-3 w-3" /> {p.readingTime} min read
                  </p>
                )}
              </div>
              <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} ${n === 1 ? "follower" : "followers"}`;
}

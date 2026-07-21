"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, UserCircle02Icon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";

interface Writer {
  username:       string;
  displayName:    string;
  bio?:           string;
  avatar?:        string;
  followersCount: number;
}

/** Dynamic "Meet the writers" grid — fetches writers; each card flips to reveal a bio on hover/tap. */
export function AboutWritersSection() {
  const { data, isLoading } = useQuery<{ writers: Writer[] }>({
    queryKey:  ["about-writers"],
    queryFn:   () => api.get("/api/writers").then(r => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const writers = data?.writers ?? [];
  if (!isLoading && writers.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community</p>
        <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Meet the writers
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The voices that make Nomeo worth reading. Hover a card to learn more,
          click to visit their profile.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <WriterCardSkeleton key={i} />)
          : writers.map((w, i) => (
              <motion.div
                key={w.username}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <FlipCard writer={w} />
              </motion.div>
            ))
        }
      </div>

      {!isLoading && writers.length > 0 && (
        <div className="mt-10 text-center">
          <Link
            href="/writers"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Browse all writers
            <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function FlipCard({ writer }: { writer: Writer }) {
  const [flipped, setFlipped] = useState(false);
  const initials = (writer.displayName || writer.username)
    .split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    /* Perspective wrapper — required for 3D flip */
    <div
      className="h-52 cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped(f => !f)} // touch support
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ── Front — avatar, name, username, followers ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {writer.avatar ? (
            <Image
              src={writer.avatar}
              alt={writer.displayName || writer.username}
              width={56} height={56}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary ring-2 ring-border">
              {initials}
            </span>
          )}
          <div className="min-w-0 w-full">
            <p className="truncate font-heading text-sm font-bold text-foreground">
              {writer.displayName || writer.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{writer.username}</p>
          </div>
          <p className="text-xs font-semibold text-primary">
            {formatFollowers(writer.followersCount)}
          </p>
          <p className="text-[10px] text-muted-foreground/50">Hover to learn more</p>
        </div>

        {/* ── Back — bio + visit profile button ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <HugeiconsIcon icon={UserCircle02Icon} className="h-7 w-7 text-primary/60" />
          <div className="min-w-0 w-full">
            <p className="truncate font-heading text-sm font-bold text-foreground">
              {writer.displayName || writer.username}
            </p>
            {writer.bio ? (
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {writer.bio}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground/60 italic">No bio yet.</p>
            )}
          </div>
          <Link
            href={`/profile/${writer.username}`}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View profile <HugeiconsIcon icon={ArrowRight02Icon} className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function WriterCardSkeleton() {
  return (
    <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="w-full space-y-1.5">
        <Skeleton className="mx-auto h-3.5 w-28 rounded" />
        <Skeleton className="mx-auto h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} ${n === 1 ? "follower" : "followers"}`;
}

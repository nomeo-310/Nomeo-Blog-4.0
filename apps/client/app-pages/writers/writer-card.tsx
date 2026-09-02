"use client";

import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, BookOpen01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
import type { TopWriter } from "@/lib/get-top-writers";

/**
 * WriterCard — one writer tile on /writers. Static, not a flip card — a
 * hover-to-reveal flip has no equivalent on touch, and tap-to-flip fights
 * with tap-to-open-the-modal on mobile. Avatar + name up top, bio and
 * stats below, "View details" opens the full-detail modal.
 */
export function WriterCard({ writer, onViewDetails }: { writer: TopWriter; onViewDetails: () => void }) {
  const initials = (writer.displayName || writer.username).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Grid rows stretch every card to the row's tallest — this spacer
          absorbs that extra height so "View details" lands on the same
          baseline across a row, whether a card has a bio or not. */}
      <div className="flex-1">
        <div className="flex items-start gap-3">
          {writer.avatar ? (
            <Image src={writer.avatar} alt={writer.displayName || writer.username} width={52} height={52} className="h-13 w-13 shrink-0 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary ring-2 ring-border">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate font-heading text-sm font-bold text-foreground">{writer.displayName || writer.username}</p>
            <p className="truncate text-xs text-muted-foreground">@{writer.username}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <HugeiconsIcon icon={UserAdd02Icon} className="h-3 w-3" /> {formatFollowers(writer.followersCount)}
            </span>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {writer.bio || "No bio yet."}
        </p>

        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-3 w-3" /> {writer.paidPostsCount} paid
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-3 w-3" /> {writer.freePostsCount} free
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewDetails}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        View details <HugeiconsIcon icon={ArrowRight02Icon} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} ${n === 1 ? "follower" : "followers"}`;
}

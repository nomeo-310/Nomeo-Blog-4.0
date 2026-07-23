"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for a moderation detail modal — mirrors the real
 * overview tab's shape (badge row, stat grid, info cards, action row) so the
 * loading state reads as a preview of the content rather than a generic box.
 * Renders as a fragment, not a padded/bordered wrapper — the Modal component
 * already supplies the surrounding padding.
 */
export function ModalContentSkeleton({ statCount = 5 }: { statCount?: number }) {
  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: statCount }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-5 w-10 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Info cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border p-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

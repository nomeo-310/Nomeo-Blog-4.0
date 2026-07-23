"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      {/* Icon placeholder */}
      <Skeleton className="h-10 w-10 rounded-xl" />

      {/* Value + label + sub */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-3 w-32 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

"use client";

import { Skeleton }             from "@/components/ui/skeleton";
import { formatDistanceToNow }  from "date-fns";
import type { RecentActivityItem } from "../types";

export function RecentActivity({
  items, isLoading,
}: {
  items?:     RecentActivityItem[];
  isLoading:  boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">Recent activity</h2>
      </div>
      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      ) : items?.length ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  {" · "}
                  {item.actorRole}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
      )}
    </div>
  );
}

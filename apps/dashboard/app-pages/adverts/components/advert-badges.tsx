"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  draft:          "bg-muted text-muted-foreground",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:       "bg-primary/10 text-primary",
  rejected:       "bg-destructive/10 text-destructive",
  scheduled:      "bg-primary/10 text-primary",
  active:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused:         "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed:      "bg-muted text-muted-foreground",
};

export function AdvertStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
      {titleCase(type)}
    </span>
  );
}

export function PlacementBadge({ placement }: { placement: string }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {titleCase(placement)}
    </span>
  );
}

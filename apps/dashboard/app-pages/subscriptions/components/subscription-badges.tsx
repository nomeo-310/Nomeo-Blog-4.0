"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  trialing:  "bg-primary/10 text-primary",
  past_due:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paused:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive",
  expired:   "bg-muted text-muted-foreground",
};

export function SubscriptionStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft:     "bg-muted text-muted-foreground",
  archived:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  removed:   "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

export function AccessBadge({ access }: { access: string }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
      {access}
    </span>
  );
}

export function ReportsBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      {count} open
    </span>
  );
}

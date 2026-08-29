"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const CREATOR_STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspended: "bg-destructive/10 text-destructive",
};

export function CreatorStatusBadge({ status }: { status: string | null }) {
  const key = status ?? "active";
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", CREATOR_STATUS_STYLES[key] ?? "bg-muted text-muted-foreground")}>
      {titleCase(key)}
    </span>
  );
}

const PAYOUT_STYLES: Record<string, string> = {
  pending:    "bg-muted text-muted-foreground",
  calculated: "bg-primary/10 text-primary",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed:     "bg-destructive/10 text-destructive",
  on_hold:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function PayoutStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", PAYOUT_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

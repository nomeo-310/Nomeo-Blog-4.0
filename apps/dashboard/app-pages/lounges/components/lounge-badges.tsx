"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed:    "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive",
};

export function LoungeStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
      {kind}
    </span>
  );
}

export function AccessTypeBadge({ accessType }: { accessType: string }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {accessType === "subscribers" ? "Subscribers only" : "Authenticated"}
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

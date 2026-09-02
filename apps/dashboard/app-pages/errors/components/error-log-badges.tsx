"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const SEVERITY_STYLES: Record<string, string> = {
  info:     "bg-muted text-muted-foreground",
  warning:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error:    "bg-destructive/10 text-destructive",
  critical: "bg-destructive/15 text-destructive font-semibold",
};

export function ErrorSeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", SEVERITY_STYLES[severity] ?? "bg-muted text-muted-foreground")}>
      {titleCase(severity)}
    </span>
  );
}

const SOURCE_STYLES: Record<string, string> = {
  frontend:        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  backend:         "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  background_job:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  webhook:         "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
};

export function ErrorSourceBadge({ source }: { source: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", SOURCE_STYLES[source] ?? "bg-muted text-muted-foreground")}>
      {titleCase(source)}
    </span>
  );
}

export function ErrorResolvedBadge({ isResolved }: { isResolved: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isResolved
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {isResolved ? "Resolved" : "Unresolved"}
    </span>
  );
}

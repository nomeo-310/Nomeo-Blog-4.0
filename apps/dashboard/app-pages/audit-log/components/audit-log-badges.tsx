"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const SEVERITY_STYLES: Record<string, string> = {
  info:     "bg-muted text-muted-foreground",
  warning:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error:    "bg-destructive/10 text-destructive",
  critical: "bg-destructive/15 text-destructive font-semibold",
};

export function AuditSeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", SEVERITY_STYLES[severity] ?? "bg-muted text-muted-foreground")}>
      {titleCase(severity)}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed:  "bg-destructive/10 text-destructive",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function AuditStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const ROLE_STYLES: Record<string, string> = {
  support:     "bg-muted text-muted-foreground",
  admin:       "bg-primary/10 text-primary",
  super_admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function AdminRoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ROLE_STYLES[role] ?? "bg-muted text-muted-foreground")}>
      {titleCase(role)}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspended: "bg-destructive/10 text-destructive",
  inactive:  "bg-muted text-muted-foreground",
};

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

/** Shown instead of AdminStatusBadge for an admin who hasn't completed first-login setup yet. */
export function PendingSetupBadge() {
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Pending setup
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const BAN_STYLES: Record<string, string> = {
  active:        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  banned:        "bg-destructive/10 text-destructive",
  shadow_banned: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function BanStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", BAN_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

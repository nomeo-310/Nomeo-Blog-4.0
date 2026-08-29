"use client";

import { cn } from "@/lib/utils";
import { titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  success:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed:    "bg-destructive/10 text-destructive",
  abandoned: "bg-muted text-muted-foreground",
  reversed:  "bg-destructive/10 text-destructive",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {titleCase(status)}
    </span>
  );
}

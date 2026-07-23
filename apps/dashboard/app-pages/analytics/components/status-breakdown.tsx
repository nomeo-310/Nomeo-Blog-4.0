"use client";

import { cn }        from "@/lib/utils";
import { formatKobo, titleCase } from "../utils";

const STATUS_STYLES: Record<string, string> = {
  paid:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  processing: "bg-primary/10 text-primary",
  calculated: "bg-primary/10 text-primary",
  pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_hold:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed:     "bg-destructive/10 text-destructive",
};

export function StatusBreakdown({
  rows, emptyLabel = "No data for this period.",
}: {
  rows: { status: string; count: number; netAmount: number }[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.status} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground"
          )}>
            {titleCase(row.status)}
          </span>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{formatKobo(row.netAmount)}</p>
            <p className="text-xs text-muted-foreground">{row.count} creator{row.count === 1 ? "" : "s"}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

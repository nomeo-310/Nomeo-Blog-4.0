"use client";

import { cn }                            from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight }   from "lucide-react";

export function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span className={cn(
      "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
      isUp
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-destructive/10 text-destructive"
    )}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

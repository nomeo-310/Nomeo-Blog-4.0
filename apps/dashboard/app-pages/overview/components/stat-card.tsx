"use client";

import Link           from "next/link";
import { cn }          from "@/lib/utils";
import { TrendBadge }  from "./trend-badge";

export function StatCard({
  label, value, sub, icon, href, danger, alert, growthPct,
}: {
  label:      string;
  value?:     string | number;
  sub?:       string;
  icon:       React.ReactNode;
  href:       string;
  danger?:    boolean;
  alert?:     boolean;
  growthPct?: number | null;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      {/* Icon + trend */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          danger ? "bg-destructive/10 text-destructive"
          : alert ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-primary/10 text-primary"
        )}>
          {icon}
        </span>
        {growthPct !== null && growthPct !== undefined && (
          <TrendBadge pct={growthPct} />
        )}
      </div>

      {/* Value + label */}
      <div>
        <p className={cn(
          "font-heading text-2xl font-bold",
          danger ? "text-destructive"
          : alert ? "text-amber-600 dark:text-amber-400"
          : "text-foreground"
        )}>
          {value ?? "—"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        {sub && (
          <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
        )}
      </div>
    </Link>
  );
}

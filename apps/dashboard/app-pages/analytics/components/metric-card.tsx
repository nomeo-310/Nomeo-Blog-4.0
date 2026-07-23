"use client";

import { cn }         from "@/lib/utils";
import { Skeleton }   from "@/components/ui/skeleton";
import { TrendBadge } from "./trend-badge";

export function MetricCard({
  label, value, sub, growthPct, icon,
}: {
  label:      string;
  value:      string | number;
  sub?:       string;
  growthPct?: number | null;
  icon?:      React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        {growthPct !== undefined && <TrendBadge pct={growthPct} />}
      </div>
      <div>
        <p className={cn("font-heading text-2xl font-bold text-foreground", !icon && "mt-1")}>{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground/80">{sub}</p>}
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>
    </div>
  );
}

"use client";

import { cn }                  from "@/lib/utils";
import { RefreshCcw }          from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function OverviewHeader({
  generatedAt, isFetching, onRefresh,
}: {
  generatedAt?: string;
  isFetching:   boolean;
  onRefresh:    () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Platform at a glance.</p>
      </div>
      <div className="flex items-center gap-3">
        {generatedAt && !isFetching && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Updated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>
    </div>
  );
}

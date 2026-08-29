"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BulkActionBar({
  count, onClear, children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">{count} selected</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Button type="button" size="icon-sm" variant="ghost" className="ml-auto rounded-full" onClick={onClear} aria-label="Clear selection">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

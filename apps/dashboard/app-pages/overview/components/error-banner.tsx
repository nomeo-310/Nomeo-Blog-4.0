"use client";

import { HugeiconsIcon }  from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";

export function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 shrink-0" />
      Failed to load.{" "}
      <button onClick={onRetry} className="underline">Retry</button>
    </div>
  );
}

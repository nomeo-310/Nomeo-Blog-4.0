import { HugeiconsIcon } from "@hugeicons/react";
import { CircleLock02Icon } from "@hugeicons/core-free-icons";

/** "Members only" info blurb shared by new-lounge and edit-lounge forms; trailing note differs per flow. */
export function LoungeAccessInfo({ note }: { note: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">Members only</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      </div>
    </div>
  );
}

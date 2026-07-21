import { HugeiconsIcon } from "@hugeicons/react";
import { Notification02Icon } from "@hugeicons/core-free-icons";

/** Empty state for the notifications archive — varies by active filter. */
export function NotificationsEmptyState({ filterLabel, isFiltered, onShowAll }: {
  filterLabel?: string;
  isFiltered: boolean;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <HugeiconsIcon icon={Notification02Icon} className="h-8 w-8 text-muted-foreground/30" />
      <h3 className="mt-4 font-heading text-base font-bold text-foreground">
        {isFiltered ? `No ${filterLabel?.toLowerCase()} notifications` : "No notifications yet"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {isFiltered ? "Try a different filter." : "Activity on your account will appear here."}
      </p>
      {isFiltered && (
        <button onClick={onShowAll} className="mt-4 text-sm font-semibold text-primary hover:underline">
          Show all
        </button>
      )}
    </div>
  );
}

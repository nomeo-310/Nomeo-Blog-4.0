import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** Horizontal scrollable filter tab bar for the notifications archive. */
export function NotificationFilterTabs({ groups, active, onChange }: {
  groups: readonly { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      <HugeiconsIcon icon={FilterHorizontalIcon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex gap-1 pl-1">
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => onChange(g.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              active === g.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}

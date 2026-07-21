import { cn } from "@/lib/utils";
import type { AdvertStatus } from "@/hooks/use-my-adverts";

const STATUS_STYLES: Record<AdvertStatus, string> = {
  draft:           "bg-muted text-muted-foreground",
  pending_review:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:        "bg-primary/10 text-primary",
  rejected:        "bg-destructive/10 text-destructive",
  scheduled:       "bg-primary/10 text-primary",
  active:          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused:          "bg-muted text-muted-foreground",
  completed:       "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<AdvertStatus, string> = {
  draft:           "Draft",
  pending_review:  "Pending review",
  approved:        "Approved",
  rejected:        "Rejected",
  scheduled:       "Scheduled",
  active:          "Live",
  paused:          "Paused",
  completed:       "Completed",
};

export function PromotionStatusBadge({ status }: { status: AdvertStatus }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

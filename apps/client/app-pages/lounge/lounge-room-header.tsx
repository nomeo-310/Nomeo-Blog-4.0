import { cn } from "@/lib/utils";
import type { LoungeDetail } from "@/hooks/use-lounge";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon, ArrowLeft02Icon, CircleLock02Icon, Globe02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";

/** Top bar of the live lounge room: back button, name/kind badge, presence, leave. */
export function LoungeRoomHeader({ lounge, onlineCount, status, onBack, onLeaveClick }: {
  lounge: LoungeDetail;
  onlineCount: number;
  status: "connecting" | "connected" | "error";
  onBack: () => void;
  onLeaveClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <button onClick={onBack} aria-label="Back" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
        <HugeiconsIcon icon={ArrowLeft02Icon} className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-heading text-base font-bold text-foreground">{lounge.name}</h1>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            lounge.kind === "platform" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {lounge.kind === "platform" ? <HugeiconsIcon icon={Globe02Icon} className="h-2.5 w-2.5" /> : <HugeiconsIcon icon={CircleLock02Icon} className="h-2.5 w-2.5" />}
            {lounge.kind === "platform" ? "Open" : "Members"}
          </span>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={UserMultiple02Icon} className="h-3 w-3" />{onlineCount} online</span>
          <span className={cn("inline-flex items-center gap-1", status === "connected" ? "text-primary" : "")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", status === "connected" ? "bg-primary" : "bg-muted-foreground/40")} />
            {status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
          </span>
        </p>
      </div>
      <button
        onClick={onLeaveClick}
        className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-destructive"
      >
        Leave <HugeiconsIcon icon={ArrowRight02Icon} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

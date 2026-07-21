import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/hooks/use-conversations";

/** One row in the messages list — avatar (+ online dot), name, last message preview, unread badge, active accent bar. */
export function MessageConversationRow({
  convo, active, currentUserId, isOnline, onClick,
}: {
  convo: ConversationListItem;
  active: boolean;
  currentUserId: string;
  isOnline: boolean;
  onClick: () => void;
}) {
  const name = convo.other?.name ?? "Unknown";
  const hasUnread = convo.unread > 0;
  const mineLast = convo.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        active ? "bg-primary/10" : hasUnread ? "bg-primary/[0.04] hover:bg-accent/50" : "hover:bg-accent/50"
      )}
    >
      {/* Active accent bar */}
      {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}

      <span className="relative shrink-0">
        {convo.other?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={convo.other.image} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        {/* Online dot */}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground")}>
            {name}
          </span>
          {convo.lastMessageAt && (
            <span className={cn("shrink-0 text-[11px]", hasUnread ? "font-semibold text-primary" : "text-muted-foreground")}>
              {timeAgo(convo.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {mineLast && "You: "}{convo.lastMessage?.body ?? "No messages yet"}
          </span>
          {hasUnread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {convo.unread > 9 ? "9+" : convo.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

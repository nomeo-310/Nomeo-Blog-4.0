import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/hooks/use-conversations";

/** One row in the conversations panel drawer — avatar, name, last message preview, unread badge. */
export function ConversationsPanelRow({
  convo, currentUserId, onClick,
}: {
  convo: ConversationListItem;
  currentUserId?: string;
  onClick: () => void;
}) {
  const name = convo.other?.name ?? "Unknown";
  const hasUnread = convo.unread > 0;
  const mineLast = convo.lastMessage?.senderId === currentUserId;

  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/50">
      <span className="relative shrink-0">
        {convo.other?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={convo.other.image} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground")}>{name}</span>
          {convo.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(convo.lastMessageAt)}</span>}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", hasUnread ? "text-foreground" : "text-muted-foreground")}>
            {mineLast && "You: "}{convo.lastMessage?.body ?? "No messages yet"}
          </span>
          {hasUnread && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
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

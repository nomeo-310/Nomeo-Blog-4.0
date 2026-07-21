import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import type { ConversationListItem } from "@/hooks/use-conversations";
import { MessageConversationRow } from "./message-conversation-row";
import { EmptyList } from "./message-empty-states";

/** LEFT column of the messages page — title/unread badge, search box, and the conversation list (loading/empty/rows). */
export function MessageSidebar({
  filtered, isLoading, query, onQueryChange, activeId, currentUserId, online, totalUnread, onSelect, listContainerRef, hiddenOnMobile,
}: {
  filtered: ConversationListItem[];
  isLoading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  activeId: string | null;
  currentUserId: string;
  online: Record<string, boolean>;
  totalUnread: number;
  onSelect: (id: string) => void;
  listContainerRef: RefObject<HTMLDivElement | null>;
  hiddenOnMobile: boolean;
}) {
  return (
    <div className={cn(
      "flex w-full shrink-0 flex-col border-r border-border sm:w-80 md:w-96",
      hiddenOnMobile && "hidden sm:flex" // on mobile, hide list when a chat is open
    )}>
      <div className="shrink-0 px-5 pt-6 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 align-middle text-xs font-bold text-primary-foreground">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </h1>
        </div>
        <div className="relative mt-4">
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div ref={listContainerRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyList query={query} />
        ) : (
          filtered.map((c) => (
            <MessageConversationRow
              key={c.id}
              convo={c}
              active={c.id === activeId}
              currentUserId={currentUserId}
              isOnline={!!(c.other?.id && online[c.other.id])}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 px-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

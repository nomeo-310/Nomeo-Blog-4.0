import type { RefObject } from "react";
import type { DirectMessageItem } from "@/hooks/use-direct-messages";
import { DmBubble } from "./dm-bubble";
import type { GroupPosition } from "./conversation-types";

/** Scrollable message thread — groups consecutive same-sender messages (Google Messages style) and renders each via DmBubble. */
export function ConversationMessageList({
  messages, hasMore, currentUserId, loadOlder, onReport, onEdit, onDelete, scrollRef, bottomRef,
}: {
  messages: DirectMessageItem[];
  hasMore: boolean;
  currentUserId: string;
  loadOlder: () => void;
  onReport: (messageId: string) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  // Hide deleted messages entirely (filter first so grouping stays correct).
  const visible = messages.filter((m) => !m.isDeleted);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-5 py-4">
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button onClick={loadOlder} className="text-xs font-medium text-primary hover:underline">Load earlier messages</button>
        </div>
      )}
      {visible.map((m, i, list) => {
        // Google-style grouping: compare against neighbours.
        const prev = list[i - 1];
        const next = list[i + 1];
        const sameAsPrev = prev && prev.senderId === m.senderId;
        const sameAsNext = next && next.senderId === m.senderId;
        const position: GroupPosition =
          !sameAsPrev && !sameAsNext ? "single"
          : !sameAsPrev && sameAsNext ? "first"
          : sameAsPrev && sameAsNext ? "middle"
          : "last";
        return (
          <DmBubble
            key={m.id}
            message={m}
            mine={String(m.senderId) === String(currentUserId)}
            groupPosition={position}
            tightTop={!!sameAsPrev}
            onReport={() => onReport(m.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

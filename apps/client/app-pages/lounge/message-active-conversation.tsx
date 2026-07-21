import { cn } from "@/lib/utils";
import { ConversationPane } from "./conversation-pane";
import { EmptyChat } from "./message-empty-states";

/** RIGHT column of the messages page — the active conversation (with a mobile back button), or an empty state. */
export function MessageActiveConversation({
  activeId, currentUserId, currentUserName, hasConversations, onBack,
}: {
  activeId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  hasConversations: boolean;
  onBack: () => void;
}) {
  return (
    <div className={cn(
      "min-w-0 flex-1 flex-col overflow-hidden",
      activeId ? "flex" : "hidden sm:flex"
    )}>
      {activeId && currentUserId ? (
        <div className="flex h-full flex-col overflow-hidden">
          {/* Mobile back to list */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent sm:hidden"
          >
            ← All conversations
          </button>
          <div className="min-h-0 flex-1">
            <ConversationPane
              conversationId={activeId}
              currentUserId={currentUserId}
              currentUserName={currentUserName ?? "You"}
            />
          </div>
        </div>
      ) : (
        <EmptyChat hasConversations={hasConversations} />
      )}
    </div>
  );
}

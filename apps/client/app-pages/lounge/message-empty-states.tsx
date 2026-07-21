import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Edit01Icon } from "@hugeicons/core-free-icons";

/** Shown in the list when there are no conversations (or no search matches). */
export function EmptyList({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <HugeiconsIcon icon={Message01Icon} className="h-9 w-9 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-medium text-foreground">{query ? "No matches" : "No messages yet"}</p>
      {!query && <p className="mt-1 text-xs text-muted-foreground">Connect with someone to start a chat.</p>}
    </div>
  );
}

/** Shown on the right when no conversation is selected. */
export function EmptyChat({ hasConversations }: { hasConversations: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
        <HugeiconsIcon icon={Edit01Icon} className="h-7 w-7 text-primary/50" />
      </span>
      <p className="mt-5 font-heading text-base font-bold text-foreground">
        {hasConversations ? "Select a conversation" : "Your messages live here"}
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        {hasConversations
          ? "Choose someone on the left to pick up where you left off."
          : "Connect with people in the lounges, then start a private conversation."}
      </p>
    </div>
  );
}

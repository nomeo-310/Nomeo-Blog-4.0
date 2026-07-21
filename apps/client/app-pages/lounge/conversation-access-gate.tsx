import { MessageCircle } from "lucide-react";

/**
 * ConversationAccessGate — shown in place of the chat when the server denies
 * access to this specific conversation (not a participant / not connected /
 * blocked).
 */
export function ConversationAccessGate({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="h-6 w-6 text-muted-foreground" />
      </span>
      <h2 className="mt-4 font-heading text-base font-bold text-foreground">This conversation isn&apos;t available</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        It may have been removed, or you might not have access. You can only message people you&apos;re connected with.
      </p>
      <button onClick={onBack}
        className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
        Back to messages
      </button>
    </div>
  );
}

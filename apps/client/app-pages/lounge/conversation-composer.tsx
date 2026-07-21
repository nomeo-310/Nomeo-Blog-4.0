import { Send } from "lucide-react";

/** Message input row — auto-growing textarea + send button. */
export function ConversationComposer({
  draft, onDraftChange, onSubmit,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-1.5">
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder="Write a message…"
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button onClick={onSubmit} disabled={!draft.trim()} aria-label="Send"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, MoreVertical, Ban, Flag, Pencil, Trash2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useDirectMessages, type DirectMessageItem } from "@/hooks/use-direct-messages";
import { usePresence } from "@/hooks/use-presence";

/**
 * ConversationPane — the right-hand chat of the messages view (Image 2 style).
 * Self-contained: give it a conversationId and the current user, it loads the
 * thread, streams live, and supports edit/delete (own) + report (others) + block.
 *
 * Matches the lounge chat styling: Google-style grouped bubble corners, an
 * inline icon pill for actions (same on all breakpoints), top-aligned actions,
 * deleted messages hidden entirely, and a desktop width cap so bubbles don't
 * stretch across the page.
 */

/* ── Bubble grouping helper (Google Messages style) ─────────────────────── */
type GroupPosition = "single" | "first" | "middle" | "last";

function groupCorners(mine: boolean, pos: GroupPosition): string {
  const mineCorners: Record<GroupPosition, string> = {
    single: "rounded-2xl rounded-tr-md",
    first:  "rounded-2xl rounded-br-md rounded-tr-md",
    middle: "rounded-2xl rounded-r-md",
    last:   "rounded-2xl rounded-tr-md",
  };
  const otherCorners: Record<GroupPosition, string> = {
    single: "rounded-2xl rounded-tl-md",
    first:  "rounded-2xl rounded-bl-md rounded-tl-md",
    middle: "rounded-2xl rounded-l-md",
    last:   "rounded-2xl rounded-tl-md",
  };
  return (mine ? mineCorners : otherCorners)[pos];
}

export function ConversationPane({
  conversationId, currentUserId, currentUserName,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const { messages, typing, hasMore, accessDenied, send, loadOlder, signalTyping, editMessage, deleteMessage } =
    useDirectMessages(conversationId, { currentUserId, currentUserName });

  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [other, setOther] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ conversations: any[] }>("/api/dm/conversations")
      .then(({ data }) => {
        if (cancelled) return;
        const convo = data.conversations.find((c) => c.id === conversationId);
        if (convo?.other) setOther(convo.other);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conversationId]);

  // Keep the view pinned to the latest message by scrolling ONLY the messages
  // container (never scrollIntoView, which can scroll the whole page when the
  // pane first mounts / is still sizing). On first load jump instantly; after
  // that, smooth-scroll only if the user is already near the bottom.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (!didInitialScroll.current) {
      // First paint of this conversation: jump to bottom instantly, no animation.
      el.scrollTop = el.scrollHeight;
      if (el.scrollHeight > 0) didInitialScroll.current = true;
    } else if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Reset the initial-scroll flag when switching conversations.
  useEffect(() => { didInitialScroll.current = false; }, [conversationId]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft("");
  };

  const block = async () => {
    if (!other) return;
    try {
      await api.post("/api/dm/block", { targetId: other.id });
      toast.success(`You blocked ${other.name}.`);
      router.push("/messages");
    } catch {
      toast.error("Couldn't block. Try again.");
    }
  };

  const report = async (messageId: string) => {
    try {
      await api.post(`/api/dm/conversations/${conversationId}/messages/${messageId}/report`, { reason: "harassment" });
      toast.success("Reported. Our team will review it.");
    } catch {
      toast.error("Couldn't report. Try again.");
    }
  };

  const name = other?.name ?? "Conversation";
  const { online } = usePresence(other?.id ? [other.id] : []);
  const otherOnline = !!(other?.id && online[other.id]);

  // Server refused access to this conversation (not a participant / not
  // connected / blocked). Show a friendly gate instead of an empty pane.
  if (accessDenied) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-heading text-base font-bold text-foreground">This conversation isn&apos;t available</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          It may have been removed, or you might not have access. You can only message people you&apos;re connected with.
        </p>
        <button onClick={() => router.push("/messages")}
          className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
          Back to messages
        </button>
      </div>
    );
  }

  // Hide deleted messages entirely (filter first so grouping stays correct).
  const visible = messages.filter((m) => !m.isDeleted);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <span className="relative shrink-0">
          {other?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.image} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          {otherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-bold text-foreground">{name}</p>
          <p className="flex items-center gap-1 text-xs">
            {typing ? (
              <span className="text-primary">typing…</span>
            ) : otherOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-green-600 dark:text-green-500">Online</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">Offline</span>
              </>
            )}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Options" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                <button onClick={() => { setMenuOpen(false); block(); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-accent">
                  <Ban className="h-4 w-4" /> Block user
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
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
              onReport={() => report(m.id)}
              onEdit={editMessage}
              onDelete={deleteMessage}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-1.5">
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); signalTyping(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Write a message…"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <button onClick={submit} disabled={!draft.trim()} aria-label="Send"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DmBubble({
  message, mine, groupPosition, tightTop, onReport, onEdit, onDelete,
}: {
  message: DirectMessageItem;
  mine: boolean;
  groupPosition: GroupPosition;
  tightTop: boolean;
  onReport: () => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? "");

  const saveEdit = () => {
    const text = draft.trim();
    if (text && text !== message.body) onEdit(message.id, text);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("flex flex-col", mine ? "items-end" : "items-start", tightTop ? "pt-0.5" : "pt-2")}>
        <div className="flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
              if (e.key === "Escape") setEditing(false);
            }}
            rows={2}
            autoFocus
            className="w-64 resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          />
          <div className="flex gap-2 text-xs">
            <button onClick={saveEdit} className="font-medium text-primary hover:underline">Save</button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:underline">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex flex-col", mine ? "items-end" : "items-start", tightTop ? "pt-0.5" : "pt-2")}>
      <div className={cn("flex flex-row items-start gap-1 max-w-full", mine && "flex-row-reverse")}>
        {/* Bubble */}
        <div className={cn("w-fit min-w-0 px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words max-w-[85%] sm:max-w-[70%] lg:max-w-[28rem]",
          groupCorners(mine, groupPosition),
          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          message.pending && "opacity-60")}>
          {message.body}
          {message.isEdited && <span className="ml-1.5 text-[10px] opacity-60">(edited)</span>}
        </div>

        {/* Actions — inline icon pill, top-aligned, same on all breakpoints */}
        {!message.pending && (
          mine ? (
            <div className="mt-0.5 flex items-center gap-0.5 rounded-full border border-border bg-background p-1 shadow-sm">
              <button onClick={() => { setDraft(message.body ?? ""); setEditing(true); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Edit">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => onDelete(message.id)} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive" aria-label="Delete">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="mt-0.5 flex items-center rounded-full border border-border bg-background p-1 shadow-sm">
              <button onClick={onReport} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive" aria-label="Report">
                <Flag className="h-3 w-3" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
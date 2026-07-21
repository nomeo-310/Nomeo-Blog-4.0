"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import { usePresence } from "@/hooks/use-presence";
import { ConversationHeader } from "./conversation-header";
import { ConversationMessageList } from "./conversation-message-list";
import { ConversationComposer } from "./conversation-composer";
import { ConversationAccessGate } from "./conversation-access-gate";

/**
 * ConversationPane — the right-hand chat of the messages view (Image 2 style).
 * Self-contained: give it a conversationId and the current user, it loads the
 * thread, streams live, and supports edit/delete (own) + report (others) + block.
 *
 * Matches the lounge chat styling: Google-style grouped bubble corners, an
 * inline icon pill for actions (same on all breakpoints), top-aligned actions,
 * deleted messages hidden entirely, and a desktop width cap so bubbles don't
 * stretch across the page.
 *
 * Layout is composed from sibling files in this folder — conversation-header,
 * conversation-message-list (which renders dm-bubble per message),
 * conversation-composer, and conversation-access-gate — this file owns the
 * data loading, scroll behaviour, and all state/handlers.
 */
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
    return <ConversationAccessGate onBack={() => router.push("/messages")} />;
  }

  return (
    <div className="flex h-full flex-col">
      <ConversationHeader name={name} image={other?.image} online={otherOnline} typing={typing} onBlock={block} />

      <ConversationMessageList
        messages={messages}
        hasMore={hasMore}
        currentUserId={currentUserId}
        loadOlder={loadOlder}
        onReport={report}
        onEdit={editMessage}
        onDelete={deleteMessage}
        scrollRef={scrollRef}
        bottomRef={bottomRef}
      />

      <ConversationComposer
        draft={draft}
        onDraftChange={(value) => { setDraft(value); signalTyping(); }}
        onSubmit={submit}
      />
    </div>
  );
}

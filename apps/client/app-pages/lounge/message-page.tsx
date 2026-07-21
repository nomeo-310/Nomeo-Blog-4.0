"use client";

import { useState, useRef, useEffect } from "react";
import { useConversations } from "@/hooks/use-conversations";
import { usePresence } from "@/hooks/use-presence";
import { MessagesGate } from "./messages-gate";
import { authClient } from "@/lib/authClient";
import { MessageSidebar } from "./message-sidebar";
import { MessageActiveConversation } from "./message-active-conversation";

/**
 * MessagesPage — unified two-pane DM view.
 *   LEFT  : conversation list (search + your chats) — message-sidebar.tsx
 *   RIGHT : the selected conversation (live chat) — message-active-conversation.tsx
 *
 * This file owns the session/list data and all selection/search state; the
 * two panes are sibling presentational components in this same folder.
 */
export default function MessagesPage() {
  const { data: session, isPending } = authClient.useSession();
  const { conversations, isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const listContainerRef = useRef<HTMLDivElement>(null);

  const filtered = conversations.filter((c) =>
    (c.other?.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  // Online status for the people in the list.
  const partnerIds = conversations.map((c) => c.other?.id).filter(Boolean) as string[];
  const { online } = usePresence(partnerIds);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  // Keep the list pinned to the top on load (no jump).
  useEffect(() => {
    if (!isLoading && listContainerRef.current) listContainerRef.current.scrollTop = 0;
  }, [isLoading]);

  return (
    <MessagesGate sessionLoading={isPending} authed={!!session?.user}>
      <div className="mx-auto flex h-[calc(100vh-var(--nav-h,4rem))] max-w-6xl overflow-hidden bg-card">
        <MessageSidebar
          filtered={filtered}
          isLoading={isLoading}
          query={query}
          onQueryChange={setQuery}
          activeId={activeId}
          currentUserId={session?.user?.id ?? ""}
          online={online}
          totalUnread={totalUnread}
          onSelect={setActiveId}
          listContainerRef={listContainerRef}
          hiddenOnMobile={!!activeId}
        />

        <MessageActiveConversation
          activeId={activeId}
          currentUserId={session?.user?.id}
          currentUserName={session?.user?.name}
          hasConversations={conversations.length > 0}
          onBack={() => setActiveId(null)}
        />
      </div>
    </MessagesGate>
  );
}

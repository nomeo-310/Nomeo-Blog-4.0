"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { useConversationsPanel } from "@/stores/conversations-panel-store";

/**
 * ChatBubble — a persistent, Messenger-style floating trigger for
 * ConversationsPanel (the DM drawer, see conversations-panel.tsx).
 *
 * Before this, the panel's only entry point was a button on /lounges — this
 * makes DMs reachable from anywhere in the app while signed in. Toggles the
 * exact same panel/store the lounges page already uses; no new drawer.
 *
 * Mount once near the app root, alongside <ConversationsPanel />, only for
 * a signed-in user (see app/layout.tsx).
 */
export function ChatBubble() {
  const { isOpen, toggle } = useConversationsPanel();
  const { conversations } = useConversations();
  const pathname = usePathname();

  // Redundant on the messages routes themselves, and while the drawer it
  // opens is already open (avoids two overlapping "open messages" affordances).
  const onMessagesRoute = pathname?.startsWith("/messages") ?? false;
  if (isOpen || onMessagesRoute) return null;

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
      // bottom-24 stacks this above <ScrollToTop /> (fixed bottom-8 right-8,
      // ~56px tall) instead of overlapping it.
      className="fixed bottom-24 right-8 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

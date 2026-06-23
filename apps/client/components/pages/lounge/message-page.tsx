"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useConversations, type ConversationListItem } from "@/hooks/use-conversations";
import { usePresence } from "@/hooks/use-presence";
import { ConversationPane } from "./conversation-pane";
import { MessagesGate } from "./messages-gate";
import { authClient } from "@/lib/authClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Message01Icon, Edit01Icon } from "@hugeicons/core-free-icons";

/**
 * MessagesPage — unified two-pane DM view.
 *   LEFT  : conversation list (search + your chats)
 *   RIGHT : the selected conversation (live chat)
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
        {/* LEFT: conversation list */}
        <div className={cn(
          "flex w-full shrink-0 flex-col border-r border-border sm:w-80 md:w-96",
          activeId && "hidden sm:flex" // on mobile, hide list when a chat is open
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
                onChange={(e) => setQuery(e.target.value)}
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
                <ConversationRow
                  key={c.id}
                  convo={c}
                  active={c.id === activeId}
                  currentUserId={session?.user?.id ?? ""}
                  isOnline={!!(c.other?.id && online[c.other.id])}
                  onClick={() => setActiveId(c.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: active conversation */}
        <div className={cn(
          "min-w-0 flex-1 flex-col overflow-hidden",
          activeId ? "flex" : "hidden sm:flex"
        )}>
          {activeId && session?.user ? (
            <div className="flex h-full flex-col overflow-hidden">
              {/* Mobile back to list */}
              <button
                onClick={() => setActiveId(null)}
                className="flex items-center gap-1.5 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent sm:hidden"
              >
                ← All conversations
              </button>
              <div className="min-h-0 flex-1">
                <ConversationPane
                  conversationId={activeId}
                  currentUserId={session.user.id}
                  currentUserName={session.user.name ?? "You"}
                />
              </div>
            </div>
          ) : (
            <EmptyChat hasConversations={conversations.length > 0} />
          )}
        </div>
      </div>
    </MessagesGate>
  );
}

/* ── Conversation row ───────────────────────────────────────────────────── */

function ConversationRow({
  convo, active, currentUserId, isOnline, onClick,
}: {
  convo: ConversationListItem;
  active: boolean;
  currentUserId: string;
  isOnline: boolean;
  onClick: () => void;
}) {
  const name = convo.other?.name ?? "Unknown";
  const hasUnread = convo.unread > 0;
  const mineLast = convo.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        active ? "bg-primary/10" : hasUnread ? "bg-primary/[0.04] hover:bg-accent/50" : "hover:bg-accent/50"
      )}
    >
      {/* Active accent bar */}
      {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}

      <span className="relative shrink-0">
        {convo.other?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={convo.other.image} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        {/* Online dot */}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground")}>
            {name}
          </span>
          {convo.lastMessageAt && (
            <span className={cn("shrink-0 text-[11px]", hasUnread ? "font-semibold text-primary" : "text-muted-foreground")}>
              {timeAgo(convo.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {mineLast && "You: "}{convo.lastMessage?.body ?? "No messages yet"}
          </span>
          {hasUnread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {convo.unread > 9 ? "9+" : convo.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Empty states ───────────────────────────────────────────────────────── */

function EmptyList({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <HugeiconsIcon icon={Message01Icon} className="h-9 w-9 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-medium text-foreground">{query ? "No matches" : "No messages yet"}</p>
      {!query && <p className="mt-1 text-xs text-muted-foreground">Connect with someone to start a chat.</p>}
    </div>
  );
}

function EmptyChat({ hasConversations }: { hasConversations: boolean }) {
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

/* ── Bits ───────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
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
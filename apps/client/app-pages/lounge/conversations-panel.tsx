"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Search, ArrowRight } from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { useConversationsPanel } from "@/stores/conversations-panel-store";
import { ConversationsPanelRow } from "./conversations-panel-row";

/**
 * ConversationsPanel — a slide-in list of recent DMs (right drawer, standard
 * width). Open it from the lounges header (or anywhere) via the store. Clicking
 * a row routes into that conversation; a footer link goes to the full inbox.
 *
 * Mount ONCE near the app root (e.g. root layout, inside providers).
 */
export function ConversationsPanel({ currentUserId }: { currentUserId?: string }) {
  const { isOpen, close } = useConversationsPanel();
  const { conversations, isLoading } = useConversations();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!mounted) return null;

  const filtered = conversations.filter((c) =>
    (c.other?.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const go = (id: string) => { close(); router.push(`/messages/${id}`); };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={close}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[90] flex h-dvh w-full max-w-md flex-col border-l border-border bg-background sm:w-[420px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Messages</h2>
              <button onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {isLoading ? (
                <ListSkeleton />
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-20 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-4 text-sm font-medium text-foreground">{query ? "No matches" : "No conversations yet"}</p>
                  {!query && <p className="mt-1 max-w-xs text-xs text-muted-foreground">Connect with people in the lounges to start chatting.</p>}
                </div>
              ) : (
                filtered.map((c) => (
                  <ConversationsPanelRow key={c.id} convo={c} currentUserId={currentUserId} onClick={() => go(c.id)} />
                ))
              )}
            </div>

            {/* Footer → full inbox */}
            <div className="border-t border-border p-3">
              <button
                onClick={() => { close(); router.push("/messages"); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open all messages <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 px-1 py-1">
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
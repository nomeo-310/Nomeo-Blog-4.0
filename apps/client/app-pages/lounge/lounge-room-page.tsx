"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLounge, type LoungeDetail } from "@/hooks/use-lounge";
import { useLoungeChat } from "@/hooks/use-lounge-chat";
import { authClient } from "@/lib/authClient";
import { UserActionPopover } from "./user-action-popover";
import { LoungeRoomHeader } from "./lounge-room-header";
import { LoungeRoomSidebar } from "./lounge-room-sidebar";
import { LoungeAccessGate } from "./lounge-access-gate";
import { MessageBubble } from "./lounge-message-bubble";
import type { GroupPosition } from "./lounge-room-types";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Cancel01Icon, Message01Icon, Delete03Icon } from "@hugeicons/core-free-icons";

/**
 * LoungeRoomPage — a single lounge's live chat.
 *
 * Layout is composed from sibling sub-components in this same folder
 * (lounge-room-header, lounge-room-sidebar, lounge-access-gate,
 * lounge-message-bubble, user-action-popover); this file owns the top-level
 * dispatch (loading/error/access-gate/live room) plus all chat state and
 * handlers for the live room itself.
 */
export default function LoungeRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { lounge, access, isLoading, isError } = useLounge(id);

  if (isLoading) return <RoomSkeleton />;
  if (isError || !lounge) {
    return (
      <Centered>
        <p className="text-sm font-medium text-foreground">This lounge couldn&apos;t be found.</p>
        <button onClick={() => router.push("/lounges")} className="mt-3 text-sm font-medium text-primary hover:underline">
          Back to lounges
        </button>
      </Centered>
    );
  }

  if (!access?.canView) {
    return <LoungeAccessGate lounge={lounge} reason={access?.reason ?? "not_authenticated"} />;
  }

  return (
    <LiveRoom
      lounge={lounge}
      canChat={!!access.canChat}
      currentUserId={session!.user.id}
      currentUserName={session!.user.name ?? "Member"}
      currentUserImage={session!.user.image ?? null}
    />
  );
}

/* ── The live chat room ─────────────────────────────────────────────────── */

function LiveRoom({
  lounge, canChat, currentUserId, currentUserName, currentUserImage,
}: {
  lounge: LoungeDetail;
  canChat: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserImage: string | null;
}) {
  const router = useRouter();
  const { messages, members, typing, status, hasMore, send, loadOlder, signalTyping, editMessage, deleteMessage, bulkDelete, leave } = useLoungeChat(lounge.id, {
    currentUserId,
    currentUserName,
    currentUserImage,
  });

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [userAction, setUserAction] = useState<{ id: string; name: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  const toggleSelect = (mid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) {
        next.delete(mid);
      } else {
        next.add(mid);
      }
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const confirmBulkDelete = async () => {
    if (selected.size === 0) return exitSelect();
    await bulkDelete([...selected]);
    toast.success(`Deleted ${selected.size} message${selected.size > 1 ? "s" : ""}.`);
    exitSelect();
  };

  useEffect(() => {
    if (isInitialRender && messages.length > 0) {
      setIsInitialRender(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [messages, isInitialRender]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      setShowJumpButton(!isNearBottom);
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isInitialRender) return;

    const currentScrollHeight = el.scrollHeight;
    const scrollTopBefore = el.scrollTop;

    if (prevScrollHeightRef.current > 0 && currentScrollHeight > prevScrollHeightRef.current) {
      const heightDiff = currentScrollHeight - prevScrollHeightRef.current;
      el.scrollTop = scrollTopBefore + heightDiff;
    }

    prevScrollHeightRef.current = currentScrollHeight;
  }, [messages, isInitialRender]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft("");
    setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const handleLeave = async () => {
    try {
      await leave();
      toast.success(`You left ${lounge.name}.`);
      router.push("/lounges");
    } catch {
      toast.error("Couldn't leave. Try again.");
    }
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-var(--nav-h,4rem))] w-full max-w-[1400px] flex-col px-0 sm:px-4">
      <LoungeRoomHeader
        lounge={lounge}
        onlineCount={members.length}
        status={status}
        onBack={() => router.push("/lounges")}
        onLeaveClick={() => setConfirmLeave(true)}
      />

      {/* Main Body Grid / Flex Layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-2">
        {/* Messages Feed Panel */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden border-card bg-background">
          {selectMode && (
            <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2">
              <button onClick={exitSelect} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" /> Cancel
              </button>
              <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
              <button
                onClick={confirmBulkDelete}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline disabled:opacity-40"
              >
                <HugeiconsIcon icon={Delete03Icon} className="h-4 w-4" /> Delete
              </button>
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
            style={{ minHeight: 0, height: "100%" }}
          >
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button onClick={loadOlder} className="text-xs font-medium text-primary hover:underline">
                  Load earlier messages
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <HugeiconsIcon icon={Message01Icon} className="h-9 w-9 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
              </div>
            ) : (
              messages
                .filter((m) => !m.isDeleted)
                .map((m, i, list) => {
                // Google-style grouping: compare against neighbours.
                const prev = list[i - 1];
                const next = list[i + 1];
                const sameAsPrev = prev && prev.author.id === m.author.id;
                const sameAsNext = next && next.author.id === m.author.id;
                const position: GroupPosition =
                  !sameAsPrev && !sameAsNext ? "single"
                  : !sameAsPrev && sameAsNext ? "first"
                  : sameAsPrev && sameAsNext ? "middle"
                  : "last";
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    mine={String(m.author.id) === String(currentUserId)}
                    showAuthor={!sameAsPrev}
                    groupPosition={position}
                    tightTop={sameAsPrev}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                    selectMode={selectMode}
                    selected={selected.has(m.id)}
                    onToggleSelect={() => toggleSelect(m.id)}
                    onStartSelect={() => { setSelectMode(true); toggleSelect(m.id); }}
                    onAvatarClick={() => setUserAction({ id: m.author.id, name: m.author.name })}
                  />
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {showJumpButton && messages.length > 0 && (
            <button
              onClick={jumpToBottom}
              className="absolute bottom-24 right-4 z-10 rounded-full bg-primary p-2.5 shadow-lg transition-all hover:scale-105 hover:opacity-90 lg:right-6"
              aria-label="Jump to latest messages"
            >
              <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}

          {typing.length > 0 && (
            <div className="border-t border-border/50 bg-background/95 px-4 pb-1 pt-2 text-xs italic text-muted-foreground backdrop-blur-sm">
              {typing.slice(0, 2).join(", ")}{typing.length > 2 ? " and others" : ""} {typing.length === 1 ? "is" : "are"} typing…
            </div>
          )}

          {/* Composer Box */}
          <div className="border-t border-border bg-background p-3">
            {canChat ? (
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); signalTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder="Write a message…"
                  rows={1}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={submit} disabled={!draft.trim()} aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                  <HugeiconsIcon icon={SentIcon} className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="rounded-lg bg-muted/50 py-2.5 text-center text-xs text-muted-foreground">
                {lounge.isMuted ? "This lounge is in read-only mode right now." : "You can read this lounge but not post."}
              </p>
            )}
          </div>
        </div>

        <LoungeRoomSidebar
          lounge={lounge}
          members={members}
          currentUserId={currentUserId}
          onMemberClick={(id, name) => setUserAction({ id, name })}
        />
      </div>

      {userAction && (
        <UserActionPopover userId={userAction.id} userName={userAction.name} onClose={() => setUserAction(null)} />
      )}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmLeave(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-base font-bold text-card-foreground">Leave {lounge.name}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {lounge.kind === "platform"
                ? "You can rejoin anytime — it's an open lounge."
                : "You'll need to request access again to come back."}
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmLeave(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                Stay
              </button>
              <button onClick={() => { setConfirmLeave(false); handleLeave(); }} className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Secondary Layout Bits ──────────────────────────────────────────────── */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-var(--nav-h,4rem))] flex-col items-center justify-center px-4 text-center">
      {children}
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="mx-auto flex h-[calc(100vh-var(--nav-h,4rem))] max-w-[1400px] flex-col px-4">
      <div className="flex items-center gap-3 border-b border-border py-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="space-y-1.5"><div className="h-4 w-40 animate-pulse rounded bg-muted" /><div className="h-3 w-24 animate-pulse rounded bg-muted" /></div>
      </div>
      <div className="flex-1 space-y-4 py-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex gap-2.5", i % 3 === 0 && "flex-row-reverse")}>
            <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="h-12 w-2/5 animate-pulse rounded-2xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

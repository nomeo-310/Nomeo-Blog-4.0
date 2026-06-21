"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Users, Lock, Globe, X, MessageCircle, Pencil, Trash2, LogOut, Check, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLounge } from "@/hooks/use-lounge";
import { useLoungeChat, type ChatMessage } from "@/hooks/use-lounge-chat";
import { authClient } from "@/lib/authClient";
import { UserActionPopover } from "./user-action-popover";
import { useAuthModal } from "@/stores/modal-store";

/**
 * LoungeRoomPage — a single lounge's live chat.
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
    return <AccessGate lounge={lounge} reason={access?.reason ?? "not_authenticated"} />;
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

/* ── Bubble grouping helper (Google Messages style) ─────────────────────── */
/**
 * groupCorners — given a message's position within a run of consecutive
 * messages from the same author, returns the corner-rounding classes.
 *
 * The "spine" is the tail side: right edge for your own messages, left edge for
 * others'. Outer corners on the spine round fully; corners stacked against an
 * adjacent same-author bubble tighten, so a run reads as one connected column.
 */
export type GroupPosition = "single" | "first" | "middle" | "last";

function groupCorners(mine: boolean, pos: GroupPosition): string {
  // Spine = the tail side: right for your own messages, left for others'.
  // Outer corners on the spine stay fully round; corners stacked against an
  // adjacent same-author bubble tighten, so a run reads as one column.
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

/* ── The live chat room ─────────────────────────────────────────────────── */

function LiveRoom({
  lounge, canChat, currentUserId, currentUserName, currentUserImage,
}: {
  lounge: NonNullable<ReturnType<typeof useLounge>["lounge"]>;
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
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => router.push("/lounges")} aria-label="Back" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-base font-bold text-foreground">{lounge.name}</h1>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              lounge.kind === "platform" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {lounge.kind === "platform" ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
              {lounge.kind === "platform" ? "Open" : "Members"}
            </span>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{members.length} online</span>
            <span className={cn("inline-flex items-center gap-1", status === "connected" ? "text-primary" : "")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", status === "connected" ? "bg-primary" : "bg-muted-foreground/40")} />
              {status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
            </span>
          </p>
        </div>
        <button
          onClick={() => setConfirmLeave(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" /> Leave
        </button>
      </div>

      {/* Main Body Grid / Flex Layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-2">
        {/* Messages Feed Panel */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden border-card bg-background">
          {selectMode && (
            <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2">
              <button onClick={exitSelect} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" /> Cancel
              </button>
              <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
              <button
                onClick={confirmBulkDelete}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" /> Delete
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
                <MessageCircle className="h-9 w-9 text-muted-foreground/30" />
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
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="rounded-lg bg-muted/50 py-2.5 text-center text-xs text-muted-foreground">
                {lounge.isMuted ? "This lounge is in read-only mode right now." : "You can read this lounge but not post."}
              </p>
            )}
          </div>
        </div>

        {/* Info Side Panel */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-background/50">
          <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
            {lounge.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lounge.coverImage.secureUrl} alt="" className="h-20 xl:h-24 w-full rounded object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                {lounge.name.charAt(0).toUpperCase()}
              </span>
            )}
            <h2 className="mt-2.5 font-heading text-base font-bold text-foreground">{lounge.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lounge.kind === "platform" ? "Open lounge" : "Members-only"} · {lounge.membersCount.toLocaleString()} members
            </p>
          </div>

          {lounge.description && (
            <div className="border-t border-border px-5 py-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="text-xs leading-relaxed text-foreground/80">{lounge.description}</p>
            </div>
          )}

          {/* House Rules Section */}
          {lounge.rules.length > 0 && (
            <div className="border-t border-border bg-accent/10 px-5 py-4">
              <div className="mb-2.5 flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">House Rules</p>
              </div>
              <ol className="space-y-2 mt-3">
                {lounge.rules.map((rule, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-foreground/80">{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Active Users Listing */}
          <div className="flex-1 border-t border-border px-5 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Online now</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
                {members.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {members.map((m) => {
                const isMe = String(m.clientId) === String(currentUserId);
                return (
                  <button
                    key={m.clientId}
                    type="button"
                    disabled={isMe}
                    onClick={() => !isMe && setUserAction({ id: m.clientId, name: m.name ?? "Member" })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left",
                      isMe ? "cursor-default" : "hover:bg-accent"
                    )}
                  >
                    <span className="relative">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {(m.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-primary" />
                    </span>
                    <span className="truncate text-xs font-medium text-foreground">
                      {m.name ?? "Member"}{isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
                    </span>
                  </button>
                );
              })}
              {members.length === 0 && <p className="px-2 text-xs text-muted-foreground">Just you for now.</p>}
            </div>
          </div>
        </aside>
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

/* ── Message bubble with Mobile-Safe Integrated Actions ─────────────────── */

function MessageBubble({
  message, mine, showAuthor, groupPosition, tightTop, onEdit, onDelete,
  selectMode, selected, onToggleSelect, onStartSelect, onAvatarClick,
}: {
  message: ChatMessage;
  mine: boolean;
  showAuthor: boolean;
  groupPosition: GroupPosition;
  tightTop: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onStartSelect: () => void;
  onAvatarClick: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);

  const saveEdit = () => {
    const text = draft.trim();
    if (text && text !== message.body) onEdit(message.id, text);
    setEditing(false);
  };

  const selectable = mine && !message.isDeleted && !message.pending;
  const rowClick = selectMode && selectable ? onToggleSelect : undefined;

  return (
    <div
      className={cn(
        "group relative flex gap-2.5 rounded-lg px-2 transition-colors select-none",
        // Tighten vertical gap within a run, normal gap between runs.
        tightTop ? "pt-0.5" : "pt-1",
        "pb-0.5",
        mine && "flex-row-reverse",
        selectMode && selectable && "cursor-pointer hover:bg-accent/40",
        selected && "bg-primary/5"
      )}
      onClick={rowClick}
    >
      {/* Checkbox selector */}
      {selectMode && (
        <div className="flex w-5 shrink-0 items-center justify-center">
          {selectable && (
            <span className={cn("flex h-4 w-4 items-center justify-center rounded border",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
              {selected && <Check className="h-3 w-3" />}
            </span>
          )}
        </div>
      )}

      {/* Profile Pic Anchor — reserve space even when hidden, so a run stays aligned */}
      <div className="w-7 shrink-0">
        {showAuthor && !mine && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAvatarClick(); }}
            className="rounded-full transition-transform hover:scale-105"
          >
            {message.author.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={message.author.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {message.author.name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Bubble Shell Body */}
      <div className={cn("relative flex min-w-0 max-w-full flex-col", mine && "items-end")}>
        {showAuthor && !mine && <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{message.author.name}</p>}

        {editing ? (
          <div className="flex flex-col gap-1.5 bg-background p-2 rounded-xl border border-border shadow-sm w-64">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-foreground outline-none px-1"
              autoFocus
            />
            <div className="flex gap-2 text-xs border-t border-border pt-1.5 justify-end">
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:underline">Cancel</button>
              <button onClick={saveEdit} className="font-semibold text-primary hover:underline">Save</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-start gap-1 max-w-full">
            {/* The actual chat bubble container */}
            <div className={cn("order-1 lg:order-2 w-fit min-w-0 px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words max-w-[85%] sm:max-w-[70%] lg:max-w-[28rem]",
              groupCorners(mine, groupPosition),
              mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              message.pending && "opacity-60")}>
              {message.body}
              {message.isEdited && <span className="ml-1.5 text-[10px] opacity-60">(edited)</span>}
            </div>

            {/* Actions — after bubble on mobile (order-2), before bubble on desktop (order-1) */}
            {mine && !selectMode && !message.isDeleted && !message.pending && (
              <div className="order-2 lg:order-1 mt-0.5">
                <MessageActions
                  onEdit={() => { setDraft(message.body); setEditing(true); }}
                  onDelete={() => onDelete(message.id)}
                  onStartSelect={onStartSelect}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Message actions: one inline icon pill, same on all breakpoints ─────── */

function MessageActions({
  onEdit, onDelete, onStartSelect,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onStartSelect: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-background p-1 shadow-sm">
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent" aria-label="Edit">
        <Pencil className="h-3 w-3" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive active:bg-accent" aria-label="Delete">
        <Trash2 className="h-3 w-3" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onStartSelect(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent" aria-label="Select">
        <CheckSquare className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Secondary Layout Bits ──────────────────────────────────────────────── */

function AccessGate({ lounge, reason }: { lounge: NonNullable<ReturnType<typeof useLounge>["lounge"]>; reason: string }) {
  const router = useRouter();
  const { open: openAuth, setMode } = useAuthModal();

  const needsAuth = reason === "not_authenticated";
  const needsSub = reason === "needs_subscription";

  // Dismissing the gate returns to the lounges list (rather than revealing an
  // inaccessible lounge behind it).
  const dismiss = () => router.push("/lounges");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={dismiss}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-4 w-4 text-primary" />
            </span>
            <h3 className="font-heading text-base font-bold text-card-foreground">{lounge.name}</h3>
          </div>
          <button onClick={dismiss} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {needsAuth && "Sign in to join this lounge and start chatting."}
          {needsSub && `This is a members-only lounge${lounge.creator ? ` by ${lounge.creator.displayName}` : ""}. Subscribe to join the conversation.`}
          {!needsAuth && !needsSub && "You don't have access to this lounge right now."}
        </p>

        {/* Actions */}
        <div className="mt-6">
          {needsAuth && (
            <button onClick={() => { setMode("sign-in"); openAuth(); }}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              Sign in
            </button>
          )}
          {needsSub && (
            <button onClick={() => router.push("/membership")}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              See membership
            </button>
          )}
          <button onClick={dismiss} className="mt-3 w-full text-sm font-medium text-primary hover:underline">
            Back to lounges
          </button>
        </div>
      </div>
    </div>
  );
}

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
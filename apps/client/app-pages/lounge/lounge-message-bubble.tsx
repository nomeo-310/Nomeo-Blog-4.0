"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, Delete03Icon, CheckmarkCircle02Icon, CheckmarkSquare02Icon } from "@hugeicons/core-free-icons";
import type { ChatMessage } from "@/hooks/use-lounge-chat";
import type { GroupPosition } from "./lounge-room-types";

/* ── Bubble grouping helper (Google Messages style) ─────────────────────── */
/**
 * groupCorners — given a message's position within a run of consecutive
 * messages from the same author, returns the corner-rounding classes.
 *
 * The "spine" is the tail side: right edge for your own messages, left edge for
 * others'. Outer corners on the spine round fully; corners stacked against an
 * adjacent same-author bubble tighten, so a run reads as one connected column.
 */
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

/* ── Message bubble with Mobile-Safe Integrated Actions ─────────────────── */

export function MessageBubble({ message, mine, showAuthor, groupPosition, tightTop, onEdit, onDelete, selectMode, selected, onToggleSelect, onStartSelect, onAvatarClick }: {
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
              {selected && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3" />}
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

function MessageActions({ onEdit, onDelete, onStartSelect }: {
  onEdit: () => void;
  onDelete: () => void;
  onStartSelect: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-background p-1 shadow-sm">
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent" aria-label="Edit">
        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3 w-3" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive active:bg-accent" aria-label="Delete">
        <HugeiconsIcon icon={Delete03Icon} className="h-3 w-3" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onStartSelect(); }} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent" aria-label="Select">
        <HugeiconsIcon icon={CheckmarkSquare02Icon} className="h-3 w-3" />
      </button>
    </div>
  );
}

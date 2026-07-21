"use client";

import { useState } from "react";
import { Pencil, Trash2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectMessageItem } from "@/hooks/use-direct-messages";
import type { GroupPosition } from "./conversation-types";

/* ── Bubble grouping helper (Google Messages style) ─────────────────────── */
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

/** One message bubble — own vs. other styling, group corners, inline edit (own)/report (others)/delete (own) actions. */
export function DmBubble({
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

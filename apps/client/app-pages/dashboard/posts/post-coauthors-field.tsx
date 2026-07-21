"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COAUTHOR_ROLES } from "./post-form-types";
import type { CoAuthor, CoAuthorRole, SearchUser } from "./post-form-types";

interface CoAuthorsFieldProps {
  coAuthors: CoAuthor[];
  caQuery: string;
  onCaQueryChange: (value: string) => void;
  caResults: SearchUser[];
  caSearching: boolean;
  onAdd: (user: SearchUser) => void;
  onRemove: (userId: string) => void;
  onUpdate: (userId: string, patch: Partial<CoAuthor>) => void;
  description: string;
  headingIcon: React.ReactNode;
  searchIcon: React.ReactNode;
  addIcon: React.ReactNode;
  removeIcon: React.ReactNode;
  removeButtonClassName: string;
  checkIcon: React.ReactNode;
}

/**
 * CoAuthorsField — co-author search/invite + list, shared by NewPostPage
 * and EditPostPage.
 *
 * EditPostPage's co-authors carry a `status` (pending/accepted/declined)
 * that NewPostPage's never do; the status badge and "can't remove an
 * accepted co-author" rule below key off `ca.status` being present, so
 * this renders identically to the pre-split NewPostPage markup when
 * `status` is absent.
 */
export function CoAuthorsField({
  coAuthors, caQuery, onCaQueryChange, caResults, caSearching, onAdd, onRemove, onUpdate,
  description, headingIcon, searchIcon, addIcon, removeIcon, removeButtonClassName, checkIcon,
}: CoAuthorsFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        {headingIcon}
        Co-authors
      </label>
      <p className="mb-3 text-xs text-muted-foreground">
        {description}
      </p>

      {/* Search */}
      <div className="relative">
        {searchIcon}
        <input value={caQuery} onChange={(e) => onCaQueryChange(e.target.value)}
          placeholder="Search by name or @username…"
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
      </div>

      {/* Search results dropdown */}
      {(caResults.length > 0 || caSearching) && (
        <div className="mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          {caSearching && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
          {caResults.map((u) => (
            <button key={u.id} onClick={() => onAdd(u)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent">
              {u.avatar
                ? <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.charAt(0)}</span>}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              {addIcon}
            </button>
          ))}
        </div>
      )}

      {/* Added co-authors */}
      {coAuthors.length > 0 && (
        <div className="mt-3 space-y-2">
          {coAuthors.map((ca) => (
            <div key={ca.userId} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-3">
                {ca.avatar
                  ? <img src={ca.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                  : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ca.name.charAt(0)}</span>}
                {ca.status ? (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{ca.name}</p>
                      {/* Status badge */}
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        ca.status === "accepted"  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : ca.status === "declined" ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground")}>
                        {ca.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">@{ca.username}</p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{ca.name}</p>
                    <p className="text-xs text-muted-foreground">@{ca.username}</p>
                  </div>
                )}
                {/* Can't remove accepted co-authors — they'd need to be removed via a separate flow */}
                {ca.status !== "accepted" && (
                  <button onClick={() => onRemove(ca.userId)}
                    className={removeButtonClassName}>
                    {removeIcon}
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {/* Role */}
                <Select value={ca.role} onValueChange={(v) => onUpdate(ca.userId, { role: v as CoAuthorRole })}>
                  <SelectTrigger className="h-8 w-32 rounded-lg border-border bg-muted/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COAUTHOR_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Show on byline */}
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <button
                    onClick={() => onUpdate(ca.userId, { showOnByline: !ca.showOnByline })}
                    className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      ca.showOnByline ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
                    {ca.showOnByline && checkIcon}
                  </button>
                  Show on byline
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

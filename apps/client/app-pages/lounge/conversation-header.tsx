"use client";

import { useState } from "react";
import { MoreVertical, Ban } from "lucide-react";

/** Top bar — the other participant's avatar, name, online/typing status, and an options menu (block). */
export function ConversationHeader({
  name, image, online, typing, onBlock,
}: {
  name: string;
  image: string | null | undefined;
  online: boolean;
  typing: boolean;
  onBlock: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
      <span className="relative shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-bold text-foreground">{name}</p>
        <p className="flex items-center gap-1 text-xs">
          {typing ? (
            <span className="text-primary">typing…</span>
          ) : online ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-green-600 dark:text-green-500">Online</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">Offline</span>
            </>
          )}
        </p>
      </div>
      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} aria-label="Options" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
          <MoreVertical className="h-5 w-5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <button onClick={() => { setMenuOpen(false); onBlock(); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-accent">
                <Ban className="h-4 w-4" /> Block user
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

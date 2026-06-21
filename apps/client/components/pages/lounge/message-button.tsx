"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenDM } from "@/hooks/use-open-dm";

/**
 * MessageButton — starts (or opens) a DM with another user, then routes into
 * the conversation. Drop this where the person is already connected (e.g. a
 * connections list). Uses the shared useOpenDM hook, so messaging behaves
 * identically everywhere and errors surface from one place.
 *
 *   <MessageButton userId={user.id} />
 */
export function MessageButton({
  userId,
  label = "Message",
  className,
}: {
  userId: string;
  label?: string;
  className?: string;
}) {
  const { openDM, opening } = useOpenDM();
  const isMessaging = opening === userId;

  return (
    <button
      type="button"
      onClick={() => openDM(userId)}
      disabled={isMessaging}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50",
        className
      )}
    >
      {isMessaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {label}
    </button>
  );
}
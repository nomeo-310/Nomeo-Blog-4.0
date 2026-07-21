"use client";

import { useRouter } from "next/navigation";
import { useAuthModal } from "@/stores/modal-store";
import type { LoungeDetail } from "@/hooks/use-lounge";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleLock02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

/** Modal shown in place of the room when the viewer can't view a lounge yet (signed out or needs a subscription). */
export function LoungeAccessGate({ lounge, reason }: { lounge: LoungeDetail; reason: string }) {
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
              <HugeiconsIcon icon={CircleLock02Icon} className="h-4 w-4 text-primary" />
            </span>
            <h3 className="font-heading text-base font-bold text-card-foreground">{lounge.name}</h3>
          </div>
          <button onClick={dismiss} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-accent">
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
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

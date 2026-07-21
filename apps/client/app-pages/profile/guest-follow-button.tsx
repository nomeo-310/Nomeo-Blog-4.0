"use client";

import { useAuthModal } from "@/stores/modal-store";
import { saveRedirectIntent } from "@/lib/redirect-storage";

/**
 * Follow button shown on a profile to a signed-out visitor. Following
 * requires an account, so this doesn't call any follow API — it opens the
 * sign-in modal (saving the current profile URL first so the visitor lands
 * back here once they're authenticated), mirroring the gated-action pattern
 * used for likes/comments/lounges elsewhere (see post-actions.tsx).
 */
export function GuestFollowButton() {
  const { open, setMode } = useAuthModal();

  return (
    <button
      type="button"
      onClick={() => {
        saveRedirectIntent();
        setMode("sign-in");
        open();
      }}
      className="rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60"
    >
      Follow
    </button>
  );
}

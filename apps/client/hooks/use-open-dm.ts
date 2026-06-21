"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/axios";

/**
 * useOpenDM — one consistent "open a DM with this user" action, used anywhere a
 * person's avatar/name is clickable (lounge bubbles, member panel, inbox, etc).
 *
 * It creates-or-fetches the conversation and routes to /messages/[id]. The
 * server enforces the rule (must be connected, not blocked), so we surface the
 * reason clearly instead of failing silently — that's the fix for "clicking
 * does nothing".
 *
 *   const { openDM, opening } = useOpenDM();
 *   <button onClick={() => openDM(user.id)} disabled={opening}>...</button>
 */
export function useOpenDM() {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null); // userId in flight

  const openDM = async (otherUserId: string) => {
    if (!otherUserId) return;
    setOpening(otherUserId);
    try {
      const { data } = await api.post<{ conversationId: string }>("/api/dm/conversations", {
        otherId: otherUserId,
      });
      router.push(`/messages/${data.conversationId}`);
    } catch (err: any) {
      const reason = err?.response?.data?.error;
      if (reason === "NOT_CONNECTED") {
        toast.error("You can only message people you're connected with.");
      } else if (reason === "BLOCKED") {
        toast.error("You can't message this person.");
      } else if (reason === "SELF") {
        // clicking yourself — silently ignore
      } else {
        toast.error("Couldn't open the conversation. Try again.");
      }
    } finally {
      setOpening(null);
    }
  };

  return { openDM, opening };
}
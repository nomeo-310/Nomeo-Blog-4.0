"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

/**
 * useRequestJoin — sends a "request to join" for a members-only lounge.
 * On success the lounge's creator gets a notification and must approve.
 * Invalidates the lounges list so the card flips to "pending".
 */
export function useRequestJoin() {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const requestJoin = async (loungeId: string) => {
    setPendingId(loungeId);
    try {
      const { data } = await api.post<{ status?: string; code?: string; canResendAfter?: string }>(
        `/api/lounges/${loungeId}/join-request`,
        {}
      );
      if (data.status === "approved") {
        toast.success("You're already a member — opening the lounge.");
      } else {
        toast.success("Request sent. The creator will review it.");
      }
      qc.invalidateQueries({ queryKey: ["lounges"] });
      return data;
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "COOLDOWN") {
        toast.error("You requested recently. Try again later.");
      } else if (code === "OWN_LOUNGE") {
        toast.error("You own this lounge.");
      } else if (err?.response?.status === 401) {
        toast.error("Sign in to request to join.");
      } else {
        toast.error("Couldn't send request. Try again.");
      }
      return null;
    } finally {
      setPendingId(null);
    }
  };

  return { requestJoin, pendingId };
}
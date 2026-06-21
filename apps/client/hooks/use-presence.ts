"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

/**
 * usePresence — given a list of user ids, returns which are currently online.
 * Polls every 30s so dots stay reasonably fresh without a live subscription.
 *
 *   const { online } = usePresence(userIds);
 *   online[someUserId] === true  // they're online
 */
export function usePresence(userIds: string[]) {
  // Stable key regardless of order.
  const key = [...new Set(userIds.filter(Boolean))].sort();

  const query = useQuery({
    queryKey: ["presence", key],
    enabled: key.length > 0,
    queryFn: async () => {
      const { data } = await api.get<{ online: Record<string, boolean> }>(
        `/api/presence?userIds=${encodeURIComponent(key.join(","))}`
      );
      return data.online ?? {};
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  return { online: query.data ?? {}, isLoading: query.isLoading };
}
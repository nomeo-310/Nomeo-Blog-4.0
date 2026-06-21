"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Ably from "ably";
import { api } from "@/lib/axios";
import { registerAblyClient, unregisterAblyClient } from "@/lib/ably-registry";
import { useRouter } from "next/navigation";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string | null;
  actor: { id: string; name: string; username: string; avatar: string | null } | null;
}

export interface ConnectionRequestItem {
  id: string;
  message: string | null;
  createdAt: string | null;
  user: { id: string; name: string; username: string; avatar: string | null; bio: string | null };
}

/* ── Notifications ─────────────────────────────────────────────────────── */

export function useNotifications(filter: "all" | "unread" = "all") {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", filter],
    queryFn: async () => {
      const { data } = await api.get<{ notifications: NotificationItem[]; unreadCount: number; hasMore: boolean }>(
        `/api/notifications?filter=${filter}`
      );
      return data;
    },
    staleTime: 15_000,
  });

  const markRead = useMutation<any, unknown, { ids?: string[]; all?: boolean }>({
    mutationFn: async (payload) => {
      const { data } = await api.post("/api/notifications/read", payload);
      return data;
    },
    onMutate: async (payload) => {
      // Optimistically remove read notifications from the unread list so they
      // vanish from the slider instantly — same feel as the connections tab.
      await qc.cancelQueries({ queryKey: ["notifications", "unread"] });
      const prev = qc.getQueryData(["notifications", "unread"]);
      qc.setQueryData(["notifications", "unread"], (old: any) => {
        if (!old) return old;
        const notifications = payload.all
          ? []
          : old.notifications?.filter((n: any) => !payload.ids?.includes(n.id)) ?? [];
        return { ...old, notifications, unreadCount: notifications.length };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["notifications", "unread"], ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["activity-count"] });
    },
  });

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    markRead: markRead.mutateAsync,
    isMarking: markRead.isPending,
  };
}

/* ── Connection requests ───────────────────────────────────────────────── */

export function useConnectionRequests() {
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["connection-requests"],
    queryFn: async () => {
      const { data } = await api.get<{ requests: ConnectionRequestItem[]; pendingCount: number }>(
        "/api/connections/requests?direction=incoming"
      );
      return data;
    },
    staleTime: 15_000,
  });

  const respond = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      const { data } = await api.patch(`/api/connections/requests/${id}`, { action });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection-requests"] });
      qc.invalidateQueries({ queryKey: ["activity-count"] });
      router.refresh();
    },
  });

  const bulk = useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const { data } = await api.post("/api/connections/requests/bulk", { action });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection-requests"] });
      qc.invalidateQueries({ queryKey: ["activity-count"] });
      router.refresh();
    },
  });

  return {
    requests: query.data?.requests ?? [],
    pendingCount: query.data?.pendingCount ?? 0,
    isLoading: query.isLoading,
    respond: respond.mutateAsync,
    bulk: bulk.mutateAsync,
    isResponding: respond.isPending || bulk.isPending,
  };
}

/* ── Combined badge count (notifications + pending connections) ─────────── */

export function useActivityCount() {
  const query = useQuery({
    queryKey: ["activity-count"],
    queryFn: async () => {
      const [n, c] = await Promise.all([
        api.get<{ unreadCount: number }>("/api/notifications?filter=unread&limit=1"),
        api.get<{ pendingCount: number }>("/api/connections/requests?direction=incoming"),
      ]);
      const notifications = n.data.unreadCount ?? 0;
      const connections = c.data.pendingCount ?? 0;
      return { notifications, connections, total: notifications + connections };
    },
    staleTime: 30_000,
    // Slow safety-net poll only — real-time updates come via Ably push
    // (useActivityRealtime). This just self-heals any missed event.
    refetchInterval: 60_000,
  });

  return {
    notifications: query.data?.notifications ?? 0,
    connections: query.data?.connections ?? 0,
    total: query.data?.total ?? 0,
  };
}

/**
 * useActivityRealtime — subscribes to the user's personal Ably channel and
 * refreshes activity counts + lists the instant a bump arrives (new
 * notification or connection request). Mount once where the bell lives.
 *
 *   useActivityRealtime(isAuthenticated);
 */
export function useActivityRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let client: Ably.Realtime | null = null;

    // Lazy import-safe: construct only on the client.
    client = new Ably.Realtime({ authUrl: "/api/activity/token", authMethod: "GET" });
    registerAblyClient(client);

    const onBump = () => {
      if (cancelled) return;
      qc.invalidateQueries({ queryKey: ["activity-count"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["connection-requests"] });
      router.refresh()
    };

    let channel: Ably.RealtimeChannel | null = null;
    // The token's clientId is the user id; subscribe to our own channel and
    // ENTER presence so server-side presence checks can see this user online.
    client.connection.once("connected", () => {
      const cid = client!.auth.clientId;
      if (!cid) return;
      channel = client!.channels.get(`user:${cid}`);
      channel.subscribe("activity.bump", onBump);
      channel.presence.enter({ at: Date.now() }).catch(() => {});
    });

    return () => {
      cancelled = true;
      try { channel?.presence.leave(); } catch { /* ignore */ }
      try { channel?.unsubscribe(); } catch { /* ignore */ }
      try { client?.close(); } catch { /* ignore */ }
      if (client) unregisterAblyClient(client);
    };
  }, [enabled, qc]);
}
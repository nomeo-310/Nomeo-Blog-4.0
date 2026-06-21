"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { api } from "@/lib/axios";
import { registerAblyClient, unregisterAblyClient } from "@/lib/ably-registry";

/**
 * useLoungeChat — Ably-backed live chat for one lounge.
 * -----------------------------------------------------
 * - Connects to Ably using token auth from /api/lounges/[id]/token (which
 *   access-checks the user, so unauthorised users can't subscribe).
 * - Loads message history from the REST endpoint, then live-appends new ones.
 * - Presence: who's currently in the room (Ably presence, never hits Mongo).
 * - Typing: ephemeral events on the channel (never persisted).
 *
 * Sending POSTs to the server (persist + access re-check), with optimistic
 * render reconciled via clientTempId.
 */

export interface ChatMessage {
  id: string;
  body: string;
  clientTempId: string | null;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted?: boolean;
  createdAt: string | null;
  author: { id: string; name: string; image: string | null };
  pending?: boolean;
}

export interface PresenceMember {
  clientId: string;
  name?: string;
  image?: string | null;
}

interface Options {
  currentUserId: string;
  currentUserName: string;
  currentUserImage?: string | null;
}

export function useLoungeChat(loungeId: string, { currentUserId, currentUserName, currentUserImage }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [hasMore, setHasMore] = useState(false);

  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Connect + subscribe ───────────────────────────────────────────────
  useEffect(() => {
    if (!loungeId) return;
    let cancelled = false;

    const client = new Ably.Realtime({
      authUrl: `/api/lounges/${loungeId}/token`,
      authMethod: "GET",
    });
    clientRef.current = client;
    registerAblyClient(client);

    client.connection.on("connected", () => !cancelled && setStatus("connected"));
    client.connection.on("failed", () => !cancelled && setStatus("error"));
    client.connection.on("closed", () => { /* expected on cleanup */ });

    const channel = client.channels.get(`lounge:${loungeId}`);
    channelRef.current = channel;

    // New messages
    channel.subscribe("message.new", (msg) => {
      const incoming = msg.data as ChatMessage;
      setMessages((prev) => {
        // reconcile optimistic copy via clientTempId
        const withoutTemp = prev.filter(
          (m) => !(m.pending && m.clientTempId && m.clientTempId === incoming.clientTempId)
        );
        if (withoutTemp.some((m) => m.id === incoming.id)) return withoutTemp;
        return [...withoutTemp, incoming];
      });
    });

    // Edits + deletes from others
    channel.subscribe("message.edited", (msg) => {
      const { id, body } = msg.data as { id: string; body: string };
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body, isEdited: true } : m)));
    });
    channel.subscribe("message.deleted", (msg) => {
      const { id } = msg.data as { id: string };
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body: "", isDeleted: true } : m)));
    });

    // Typing (ephemeral)
    channel.subscribe("typing", (msg) => {
      const { clientId, name } = msg.data as { clientId: string; name: string };
      if (clientId === currentUserId) return;
      setTyping((prev) => (prev.includes(name) ? prev : [...prev, name]));
      clearTimeout(typingTimers.current[clientId]);
      typingTimers.current[clientId] = setTimeout(() => {
        setTyping((prev) => prev.filter((n) => n !== name));
      }, 3000);
    });

    // Presence
    const syncPresence = async () => {
      try {
        const page = await channel.presence.get();
        if (cancelled) return;
        setMembers(page.map((p) => ({ clientId: p.clientId, name: (p.data as any)?.name, image: (p.data as any)?.image ?? null })));
      } catch {
        /* ignore */
      }
    };
    channel.presence.subscribe(["enter", "leave", "update"], syncPresence);
    channel.presence.enter({ name: currentUserName, image: currentUserImage ?? null }).then(syncPresence).catch(() => {});

    // Initial history — use the credentialed axios instance so the session
    // cookie is sent (bare fetch may not carry it → 401 → empty list).
    api
      .get(`/api/lounges/${loungeId}/messages`)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setHasMore(!!data.hasMore);
      })
      .catch((err) => {
        if (!cancelled) console.error("[useLoungeChat] failed to load history", err);
      });

    return () => {
      cancelled = true;
      Object.values(typingTimers.current).forEach(clearTimeout);
      try {
        channel.presence.leave();
        channel.unsubscribe();
      } catch {
        /* ignore */
      }
      try {
        client.close();
      } catch {
        /* ignore */
      }
      unregisterAblyClient(client);
    };
  }, [loungeId, currentUserId, currentUserName, currentUserImage]);

  // ── Load older messages (scroll-back) ─────────────────────────────────
  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) return;
    const { data } = await api.get(`/api/lounges/${loungeId}/messages?before=${oldest.id}`);
    setMessages((prev) => [...(data.messages ?? []), ...prev]);
    setHasMore(!!data.hasMore);
  }, [loungeId, messages]);

  // ── Send ──────────────────────────────────────────────────────────────
  const send = useCallback(
    async (body: string, replyToId?: string) => {
      const text = body.trim();
      if (!text) return;

      const clientTempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: clientTempId,
        body: text,
        clientTempId,
        replyToId: replyToId ?? null,
        isEdited: false,
        createdAt: new Date().toISOString(),
        author: { id: currentUserId, name: currentUserName, image: null },
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data } = await api.post(`/api/lounges/${loungeId}/messages`, {
          body: text,
          clientTempId,
          replyToId,
        });
        const message = data.message;
        // reconcile (broadcast may also have arrived; both paths dedupe by id/tempId)
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.clientTempId !== clientTempId || !m.pending);
          if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
          return [...withoutTemp, message];
        });
      } catch {
        // mark the optimistic message as failed
        setMessages((prev) =>
          prev.map((m) => (m.clientTempId === clientTempId ? { ...m, pending: false, body: m.body } : m))
        );
      }
    },
    [loungeId, currentUserId, currentUserName]
  );

  // ── Typing signal ─────────────────────────────────────────────────────
  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      const text = newBody.trim();
      if (!text) return;
      // optimistic
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: text, isEdited: true } : m)));
      try {
        await api.patch(`/api/lounges/${loungeId}/messages/${messageId}`, { body: text });
      } catch {
        /* a refetch or next broadcast will correct it */
      }
    },
    [loungeId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: "", isDeleted: true } : m)));
      try {
        await api.delete(`/api/lounges/${loungeId}/messages/${messageId}`);
      } catch {
        /* ignore; broadcast/refetch corrects */
      }
    },
    [loungeId]
  );

  const signalTyping = useCallback(() => {
    channelRef.current?.publish("typing", { clientId: currentUserId, name: currentUserName }).catch(() => {});
  }, [currentUserId, currentUserName]);

  const bulkDelete = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;
      // optimistic
      const idSet = new Set(messageIds);
      setMessages((prev) => prev.map((m) => (idSet.has(m.id) ? { ...m, body: "", isDeleted: true } : m)));
      try {
        await api.post(`/api/lounges/${loungeId}/messages/bulk-delete`, { messageIds });
      } catch {
        /* broadcast/refetch corrects */
      }
    },
    [loungeId]
  );

  const leave = useCallback(async () => {
    await api.post(`/api/lounges/${loungeId}/leave`);
  }, [loungeId]);

  return { messages, members, typing, status, hasMore, send, loadOlder, signalTyping, editMessage, deleteMessage, bulkDelete, leave };
}
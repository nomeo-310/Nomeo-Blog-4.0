"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { api } from "@/lib/axios";
import { registerAblyClient, unregisterAblyClient } from "@/lib/ably-registry";

/**
 * useDirectMessages — Ably-backed 1:1 chat for one conversation.
 * --------------------------------------------------------------
 * Mirrors useLoungeChat but for a private conversation channel
 * (`dm:<conversationId>`). Token auth re-checks connection + block server-side,
 * so a blocked/unconnected user can't subscribe.
 */

export interface DirectMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  isDeleted: boolean;
  clientTempId: string | null;
  readAt: string | null;
  isEdited: boolean;
  createdAt: string | null;
  pending?: boolean;
}

interface Options {
  currentUserId: string;
  currentUserName: string;
}

export function useDirectMessages(conversationId: string, { currentUserId, currentUserName }: Options) {
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [accessDenied, setAccessDenied] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    const client = new Ably.Realtime({
      authUrl: `/api/dm/conversations/${conversationId}/token`,
      authMethod: "GET",
    });
    clientRef.current = client;
    registerAblyClient(client);
    client.connection.on("connected", () => !cancelled && setStatus("connected"));
    client.connection.on("failed", () => !cancelled && setStatus("error"));
    // Give the connection's close/failed states a handler so a teardown during
    // an in-flight handshake doesn't surface as an unhandled "Connection closed".
    client.connection.on("closed", () => { /* expected on cleanup */ });

    const channel = client.channels.get(`dm:${conversationId}`);
    channelRef.current = channel;

    channel.subscribe("message.new", (msg) => {
      const incoming = msg.data as DirectMessageItem;
      if (incoming.senderId === currentUserId) return; // our own echo handled optimistically
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    channel.subscribe("message.edited", (msg) => {
      const { id: mid, body } = msg.data as { id: string; body: string };
      setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, body, isEdited: true } : m)));
    });
    channel.subscribe("message.deleted", (msg) => {
      const { id: mid } = msg.data as { id: string };
      setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, body: null, isDeleted: true } : m)));
    });

    channel.subscribe("typing", (msg) => {
      const { clientId } = msg.data as { clientId: string };
      if (clientId === currentUserId) return;
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    });

    api
      .get(`/api/dm/conversations/${conversationId}/messages`)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setHasMore(!!data.hasMore);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 403) setAccessDenied(true);
        else console.error("[useDirectMessages] failed to load history", err);
      });

    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      try {
        channel.unsubscribe();
      } catch {
        /* ignore */
      }
      try {
        // Closing a still-connecting client rejects the in-flight attempt with
        // "Connection closed"; swallow it — teardown is expected here.
        client.close();
      } catch {
        /* ignore */
      }
      unregisterAblyClient(client);
    };
  }, [conversationId, currentUserId]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) return;
    const { data } = await api.get(`/api/dm/conversations/${conversationId}/messages?before=${oldest.id}`);
    setMessages((prev) => [...(data.messages ?? []), ...prev]);
    setHasMore(!!data.hasMore);
  }, [conversationId, messages]);

  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text) return;
      const clientTempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: DirectMessageItem = {
        id: clientTempId,
        conversationId,
        senderId: currentUserId,
        body: text,
        isDeleted: false,
        clientTempId,
        readAt: null,
        isEdited: false,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data } = await api.post(`/api/dm/conversations/${conversationId}/messages`, {
          body: text,
          clientTempId,
        });
        const message = data.message;
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.clientTempId !== clientTempId || !m.pending);
          if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
          return [...withoutTemp, message];
        });
      } catch {
        setMessages((prev) => prev.map((m) => (m.clientTempId === clientTempId ? { ...m, pending: false } : m)));
      }
    },
    [conversationId, currentUserId]
  );

  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      const text = newBody.trim();
      if (!text) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: text, isEdited: true } : m)));
      try {
        await api.patch(`/api/dm/conversations/${conversationId}/messages/${messageId}`, { body: text });
      } catch {
        /* broadcast/refetch corrects */
      }
    },
    [conversationId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: null, isDeleted: true } : m)));
      try {
        await api.delete(`/api/dm/conversations/${conversationId}/messages/${messageId}`);
      } catch {
        /* ignore */
      }
    },
    [conversationId]
  );

  const signalTyping = useCallback(() => {
    channelRef.current?.publish("typing", { clientId: currentUserId, name: currentUserName }).catch(() => {});
  }, [currentUserId, currentUserName]);

  return { messages, typing, status, hasMore, accessDenied, send, loadOlder, signalTyping, editMessage, deleteMessage };
}
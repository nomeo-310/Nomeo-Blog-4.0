"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";

export type RelationshipStatus =
  | "self" | "connected" | "request_sent" | "request_received" | "blocked" | "none";

export interface Relationship {
  status: RelationshipStatus;
  canMessage: boolean;
  canConnect: boolean;
}

/** What can I do with this user? (drives the click-a-user menu) */
export function useUserRelationship(userId: string | null) {
  const query = useQuery({
    queryKey: ["relationship", userId],
    queryFn: async () => {
      const { data } = await api.get<Relationship>(`/api/users/${userId}/relationship`);
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  return { relationship: query.data ?? null, isLoading: query.isLoading };
}

/** Send a connection request / disconnect / message */
export function useConnectActions(userId: string) {
  const qc = useQueryClient();
  const router = useRouter();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["relationship", userId] });

  /** Send a connection request */
  const connect = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/connections", { recipientId: userId });
      return data;
    },
    onSuccess: invalidate,
  });

  /**
   * Cancel a pending request OR disconnect an accepted connection.
   * Both go to DELETE /api/connections/[userId].
   * The route determines which action to take based on current state.
   */
  const disconnect = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/api/connections/${userId}`);
      return data;
    },
    onSuccess: invalidate,
  });

  /** Open or create a DM conversation */
  const message = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ conversationId: string }>("/api/dm/conversations", { otherId: userId });
      return data.conversationId;
    },
    onSuccess: (conversationId) => router.push(`/messages/${conversationId}`),
  });

  return {
    connect:       connect.mutateAsync,
    isConnecting:  connect.isPending,
    disconnect:    disconnect.mutateAsync,
    isDisconnecting: disconnect.isPending,
    message:       message.mutateAsync,
    isMessaging:   message.isPending,
  };
}
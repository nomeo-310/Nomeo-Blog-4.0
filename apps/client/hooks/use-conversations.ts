"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface ConversationListItem {
  id: string;
  other: { id: string; name: string; image: string | null } | null;
  lastMessage: { body: string; senderId: string; sentAt: string } | null;
  lastMessageAt: string | null;
  unread: number;
}

/** The current user's DM inbox. */
export function useConversations() {
  const query = useQuery({
    queryKey: ["dm", "conversations"],
    queryFn: async () => {
      const { data } = await api.get<{ conversations: ConversationListItem[] }>("/api/dm/conversations");
      return data.conversations;
    },
    staleTime: 20_000,
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Get-or-create a conversation with another user, then you can route to it. */
export function useStartConversation() {
  return useMutation({
    mutationFn: async (otherId: string) => {
      const { data } = await api.post<{ conversationId: string }>("/api/dm/conversations", { otherId });
      return data.conversationId;
    },
  });
}
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface LoungeDetail {
  id: string;
  kind: "creator" | "platform";
  accessType: "subscribers" | "authenticated";
  name: string;
  description: string;
  coverImage: {secureUrl: string; publicId: string; } | null;
  rules: string[];
  membersCount: number;
  messagesCount: number;
  isMuted: boolean;
  creator: { id: string; displayName: string; username: string; avatar: string | null } | null;
}

export interface LoungeAccess {
  canView: boolean;
  canChat: boolean;
  reason: string;
}

/** Single lounge + the viewer's access status (for the room page). */
export function useLounge(loungeId: string) {
  const query = useQuery({
    queryKey: ["lounge", loungeId],
    queryFn: async () => {
      const { data } = await axios.get<{ lounge: LoungeDetail; access: LoungeAccess }>(`/api/lounges/${loungeId}`);
      return data;
    },
    enabled: !!loungeId,
    staleTime: 30_000,
  });

  return {
    lounge: query.data?.lounge ?? null,
    access: query.data?.access ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
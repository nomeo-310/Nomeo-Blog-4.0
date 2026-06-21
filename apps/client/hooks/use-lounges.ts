"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface LoungeListItem {
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
  /** Creator lounges: "none" | "pending" | "approved"; platform lounges: "open" */
  joinStatus: "none" | "pending" | "approved" | "open";
  isOwner: boolean;
  creator: { id: string; displayName: string; username: string; avatar: string | null } | null;
  canBrowse: boolean;
}

interface Section {
  items: LoungeListItem[];
  totalItems: number;
  totalPages: number;
}

interface LoungesResponse {
  platform: Section;
  creator: Section;
  page: number;
  totalPages: number;
  isAuthenticated: boolean;
}

interface UseLoungesParams {
  q?: string;
  page?: number;
  limit?: number;
}

const EMPTY: Section = { items: [], totalItems: 0, totalPages: 1 };

/**
 * Active lounges for discovery, with server-side search + pagination.
 * BOTH sections (platform + creator) are returned per page, paginated
 * independently in lockstep. `totalPages` spans the longer section.
 */
export function useLounges({ q = "", page = 1, limit = 12 }: UseLoungesParams = {}) {
  const query = useQuery({
    queryKey: ["lounges", { q, page, limit }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      const { data } = await api.get<LoungesResponse>(`/api/lounges?${sp.toString()}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const platform = query.data?.platform ?? EMPTY;
  const creator = query.data?.creator ?? EMPTY;

  return {
    platformLounges: platform.items,
    creatorLounges: creator.items,
    platformTotal: platform.totalItems,
    creatorTotal: creator.totalItems,
    page: query.data?.page ?? page,
    totalPages: query.data?.totalPages ?? 1,
    // Combined total across both sections (for the "Showing X of N" line).
    totalItems: platform.totalItems + creator.totalItems,
    isAuthenticated: query.data?.isAuthenticated ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
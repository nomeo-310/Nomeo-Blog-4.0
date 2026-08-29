"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { PersonRef } from "./types";

export interface InviteHistoryItem {
  id: string;
  invitedBy: PersonRef;
  email: string;
  role: string;
  department?: string;
  personalMessage?: string;
  status: string;
  acceptedAt?: string;
  acceptedBy: PersonRef | null;
  createdAt: string;
}

export interface InvitesHistoryResponse {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  invites: InviteHistoryItem[];
}

export interface InvitesListFilters {
  page: number;
  limit: number;
}

async function fetchInvites(filters: InvitesListFilters): Promise<InvitesHistoryResponse> {
  const { data } = await api.get<InvitesHistoryResponse>("/api/admin/admins/invites", {
    params: { page: filters.page, limit: filters.limit },
  });
  return data;
}

export function useInvitesList(filters: InvitesListFilters) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-invites-list", filters],
    queryFn:  () => fetchInvites(filters),
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
    placeholderData: (previousData) => previousData,
  });
}

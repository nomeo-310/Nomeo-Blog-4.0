// hooks/use-coauthor-invites.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface CoAuthorInvite {
  postId:     string;
  postTitle:  string;
  postSlug:   string;
  postStatus: string;
  coverImage: string;
  role:       "writer" | "editor" | "reviewer";
  invitedAt:  string;
  author: {
    id:     string;
    name:   string;
    avatar: string;
  };
}

async function fetchInvites(): Promise<CoAuthorInvite[]> {
  const { data } = await api.get("/api/coauthor-invites");
  return data.invites ?? [];
}

export function useCoAuthorInvites() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["coauthor-invites"],
    queryFn:  fetchInvites,
    staleTime: 30_000,
  });

  const { mutateAsync: respond, isPending: isResponding } = useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: "accept" | "decline" }) =>
      api.patch(`/api/coauthor-invites/${postId}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coauthor-invites"] });
      // Also refresh dashboard posts in case the user wants to see it appear
      qc.invalidateQueries({ queryKey: ["dashboard-posts"] });
    },
  });

  return {
    invites:    query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    respond,
    isResponding,
  };
}
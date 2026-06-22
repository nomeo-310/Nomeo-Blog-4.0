// hooks/use-lounge-join-requests.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface LoungeJoinRequestItem {
  id:        string;
  loungeId:  string;
  loungeName:string;
  message:   string | null;
  createdAt: string;
  requester: {
    id:       string;
    name:     string;
    username: string;
    avatar:   string;
    bio:      string;
  };
}

/**
 * Fetches ALL pending join requests across all lounges the current user owns.
 * We hit each lounge individually but use a single aggregated endpoint approach:
 * the API returns requests tagged with loungeName so we don't need to cross-ref.
 *
 * Endpoint: GET /api/lounge-join-requests  (creator inbox — all pending, all lounges)
 */
async function fetchMyLoungeRequests(): Promise<LoungeJoinRequestItem[]> {
  const { data } = await api.get("/api/lounge-join-requests");
  return data.requests ?? [];
}

export function useLoungeJoinRequests() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey:  ["lounge-join-requests"],
    queryFn:   fetchMyLoungeRequests,
    staleTime: 30_000,
  });

  const { mutateAsync: respond, isPending: isResponding } = useMutation({
    mutationFn: async ({ loungeId, requestId, action }: {
      loungeId:  string;
      requestId: string;
      action:    "approve" | "decline";
    }) => {
      await api.patch(`/api/lounges/${loungeId}/join-requests/${requestId}`, { action });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lounge-join-requests"] });
    },
  });

  return { requests, isLoading, respond, isResponding };
}
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export function useDeactivateFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { followingId: string; reason?: string }) =>
      api.patch(`/api/admin/followers/${input.followingId}`, { action: "deactivate", reason: input.reason }),
    onSuccess: () => {
      toast.success("Follow relationship deactivated.");
      queryClient.invalidateQueries({ queryKey: ["admin-followers-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to deactivate follow.")),
  });
}

export function useBulkDeactivateFollows(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; reason?: string }) => {
      const { data } = await api.post<{ updated: number }>("/api/admin/followers/bulk", { ids: input.ids, action: "deactivate", reason: input.reason });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Deactivated ${data.updated} follow relationship(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-followers-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to deactivate selected follows.")),
  });
}

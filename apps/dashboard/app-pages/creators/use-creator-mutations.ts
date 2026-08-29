"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type CreatorAction = "suspend" | "reinstate" | "demote";
type PayoutAction = "hold" | "release" | "mark_paid";

function invalidateCreator(queryClient: ReturnType<typeof useQueryClient>, creatorId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-creator-detail", creatorId] });
  queryClient.invalidateQueries({ queryKey: ["admin-creators-list"] });
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const ACTION_MESSAGE: Record<CreatorAction, string> = {
  suspend:   "Creator suspended.",
  reinstate: "Creator reinstated.",
  demote:    "Creator demoted to a regular user.",
};

export function useModerateCreator(creatorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: CreatorAction; reason?: string }) =>
      api.patch(`/api/admin/creators/${creatorId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(ACTION_MESSAGE[variables.action]);
      invalidateCreator(queryClient, creatorId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update creator.")),
  });
}

const PAYOUT_MESSAGE: Record<PayoutAction, string> = {
  hold:      "Payout placed on hold.",
  release:   "Payout released.",
  mark_paid: "Payout marked as paid.",
};

export function useUpdatePayout(creatorId: string, earningId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: PayoutAction; note?: string }) =>
      api.patch(`/api/admin/creators/${creatorId}/earnings/${earningId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(PAYOUT_MESSAGE[variables.action]);
      queryClient.invalidateQueries({ queryKey: ["admin-creator-earnings", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["admin-creator-detail", creatorId] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update payout.")),
  });
}

export interface BulkCreatorActionInput {
  ids: string[];
  action: CreatorAction;
  reason?: string;
}

export function useBulkCreatorAction(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkCreatorActionInput) => {
      const { data } = await api.post<{ updated: number }>("/api/admin/creators/bulk", input);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated} creator(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-creators-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to process bulk action.")),
  });
}

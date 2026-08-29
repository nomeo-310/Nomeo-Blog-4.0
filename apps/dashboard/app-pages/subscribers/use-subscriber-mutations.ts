"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export function useUnsubscribeSubscriber(subscriberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason?: string }) =>
      api.patch(`/api/admin/subscribers/${subscriberId}`, { action: "unsubscribe", reason: input.reason }),
    onSuccess: () => {
      toast.success("Subscriber unsubscribed.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriber-detail", subscriberId] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscribers-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to unsubscribe.")),
  });
}

export function useDeleteSubscriber(subscriberId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmEmail: string }) =>
      api.delete(`/api/admin/subscribers/${subscriberId}`, { data: input }),
    onSuccess: () => {
      toast.success("Subscriber deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscribers-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete subscriber.")),
  });
}

export function useBulkSubscriberAction(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; action: "unsubscribe" | "delete"; reason?: string }) => {
      const { data } = await api.post<{ updated?: number; deleted?: number }>("/api/admin/subscribers/bulk", input);
      return { ...data, action: input.action };
    },
    onSuccess: (data) => {
      const count = data.action === "delete" ? data.deleted : data.updated;
      toast.success(data.action === "delete" ? `Deleted ${count} subscriber(s).` : `Unsubscribed ${count} subscriber(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-subscribers-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to process bulk action.")),
  });
}

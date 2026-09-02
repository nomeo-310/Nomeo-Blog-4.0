"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export function useResolveError(errorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resolutionNote: string) =>
      api.patch(`/api/admin/errors/${errorId}`, { action: "resolve", resolutionNote }),
    onSuccess: () => {
      toast.success("Error marked resolved.");
      queryClient.invalidateQueries({ queryKey: ["admin-error-log-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to resolve error.")),
  });
}

export function useReopenError(errorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/api/admin/errors/${errorId}`, { action: "reopen" }),
    onSuccess: () => {
      toast.success("Error reopened.");
      queryClient.invalidateQueries({ queryKey: ["admin-error-log-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to reopen error.")),
  });
}

export function useBulkUpdateErrors(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; action: "resolve" | "reopen"; resolutionNote?: string }) => {
      const { data } = await api.post<{ requested: number; updated: number }>("/api/admin/errors/bulk", input);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(variables.action === "resolve" ? `Resolved ${data.updated} error(s).` : `Reopened ${data.updated} error(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-error-log-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to process bulk action.")),
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { displayName?: string; avatar?: string }) =>
      api.patch("/api/admin/me", input),
    onSuccess: () => {
      toast.success("Account updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-me"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update account.")),
  });
}

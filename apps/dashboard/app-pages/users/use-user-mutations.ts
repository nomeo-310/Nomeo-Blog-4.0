"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type UserAction = "temp_ban" | "permanent_ban" | "shadow_ban" | "unban" | "warn" | "verify_email";

function invalidateUser(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
  queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const ACTION_MESSAGE: Record<UserAction, string> = {
  temp_ban:      "User temporarily banned.",
  permanent_ban: "User permanently banned.",
  shadow_ban:    "User shadow banned.",
  unban:         "User unbanned.",
  warn:          "Warning sent to user.",
  verify_email:  "Email marked as verified.",
};

export function useModerateUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: UserAction; reason?: string; banExpiresAt?: string }) =>
      api.patch(`/api/admin/users/${userId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(ACTION_MESSAGE[variables.action]);
      invalidateUser(queryClient, userId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update user.")),
  });
}

export function useDeleteUser(userId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmEmail: string }) =>
      api.delete(`/api/admin/users/${userId}`, { data: input }),
    onSuccess: () => {
      toast.success("User account deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete user.")),
  });
}

export type BulkUserAction = UserAction | "delete";

export interface BulkUserActionInput {
  ids: string[];
  action: BulkUserAction;
  reason?: string;
  banExpiresAt?: string;
  confirmText?: string;
}

export function useBulkUserAction(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkUserActionInput) => {
      const { data } = await api.post<{ updated?: number; deleted?: number }>("/api/admin/users/bulk", input);
      return data;
    },
    onSuccess: (data, variables) => {
      const count = data.deleted ?? data.updated ?? 0;
      toast.success(variables.action === "delete" ? `Deleted ${count} user account(s).` : `Updated ${count} user account(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to process bulk action.")),
  });
}

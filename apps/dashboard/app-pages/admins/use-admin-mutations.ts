"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";
import type { NewAdminCredentials } from "./types";

function invalidateAdmin(queryClient: ReturnType<typeof useQueryClient>, adminId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-admin-detail", adminId] });
  queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export interface CreateAdminInput {
  email: string;
  name: string;
  displayName?: string;
  department: string;
  role: string;
  personalMessage?: string;
}

/** On success the caller gets the plaintext temp password + seed phrase back — shown once. */
export function useCreateAdmin(onCreated: (credentials: NewAdminCredentials) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminInput) => {
      const { data } = await api.post<NewAdminCredentials>("/api/admin/admins", input);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Admin created — credentials emailed.");
      queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-invites-list"] });
      onCreated(data);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to add admin.")),
  });
}

export function useUpdateRole(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: string; reason?: string }) =>
      api.patch(`/api/admin/admins/${adminId}`, { action: "update_role", ...input }),
    onSuccess: () => {
      toast.success("Admin role updated.");
      invalidateAdmin(queryClient, adminId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update role.")),
  });
}

export function useSuspendAdmin(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string }) =>
      api.patch(`/api/admin/admins/${adminId}`, { action: "suspend", ...input }),
    onSuccess: () => {
      toast.success("Admin suspended.");
      invalidateAdmin(queryClient, adminId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to suspend admin.")),
  });
}

export function useActivateAdmin(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/api/admin/admins/${adminId}`, { action: "activate" }),
    onSuccess: () => {
      toast.success("Admin reactivated.");
      invalidateAdmin(queryClient, adminId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to reactivate admin.")),
  });
}

export function useUpdatePermissions(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: Record<string, boolean>) =>
      api.patch(`/api/admin/admins/${adminId}`, { action: "update_permissions", permissions }),
    onSuccess: () => {
      toast.success("Permissions updated.");
      invalidateAdmin(queryClient, adminId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update permissions.")),
  });
}

export function useDeleteAdmin(adminId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmEmail: string }) =>
      api.delete(`/api/admin/admins/${adminId}`, { data: input }),
    onSuccess: () => {
      toast.success("Admin access removed.");
      queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to remove admin.")),
  });
}

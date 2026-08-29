"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export interface CreateCampaignInput {
  title: string;
  subject: string;
  content: string;
  type: "newsletter" | "announcement" | "promotion";
  externalRecipients?: Array<{ email: string; name?: string }>;
}

export function useCreateCampaign(onCreated: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data } = await api.post<{ id: string }>("/api/admin/campaigns", input);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Campaign created as a draft.");
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns-list"] });
      onCreated(data.id);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to create campaign.")),
  });
}

function invalidateCampaign(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-campaign-detail", campaignId] });
  queryClient.invalidateQueries({ queryKey: ["admin-campaigns-list"] });
}

export function useSendCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<{ message?: string }>(`/api/admin/campaigns/${campaignId}`, { action: "send" });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Campaign queued.");
      invalidateCampaign(queryClient, campaignId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to send campaign.")),
  });
}

export function useCancelCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/api/admin/campaigns/${campaignId}`, { action: "cancel" }),
    onSuccess: () => {
      toast.success("Campaign cancelled.");
      invalidateCampaign(queryClient, campaignId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to cancel campaign.")),
  });
}

export function useDeleteCampaign(campaignId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/api/admin/campaigns/${campaignId}`),
    onSuccess: () => {
      toast.success("Draft campaign deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete campaign.")),
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export interface CreateSmsCampaignInput {
  title: string;
  message: string;
  audience: "subscribers" | "external" | "both";
  externalRecipients?: Array<{ phone: string; name?: string }>;
}

export function useCreateSmsCampaign(onCreated: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSmsCampaignInput) => {
      const { data } = await api.post<{ id: string }>("/api/admin/sms-campaigns", input);
      return data;
    },
    onSuccess: (data) => {
      toast.success("SMS campaign created as a draft.");
      queryClient.invalidateQueries({ queryKey: ["admin-sms-campaigns-list"] });
      onCreated(data.id);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to create SMS campaign.")),
  });
}

function invalidateCampaign(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-sms-campaign-detail", campaignId] });
  queryClient.invalidateQueries({ queryKey: ["admin-sms-campaigns-list"] });
}

export function useSendSmsCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<{ message?: string }>(`/api/admin/sms-campaigns/${campaignId}`, { action: "send" });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "SMS campaign queued.");
      invalidateCampaign(queryClient, campaignId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to send SMS campaign.")),
  });
}

export function useCancelSmsCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/api/admin/sms-campaigns/${campaignId}`, { action: "cancel" }),
    onSuccess: () => {
      toast.success("SMS campaign cancelled.");
      invalidateCampaign(queryClient, campaignId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to cancel SMS campaign.")),
  });
}

export function useDeleteSmsCampaign(campaignId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/api/admin/sms-campaigns/${campaignId}`),
    onSuccess: () => {
      toast.success("Draft SMS campaign deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-sms-campaigns-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete SMS campaign.")),
  });
}

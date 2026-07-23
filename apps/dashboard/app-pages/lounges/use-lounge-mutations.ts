"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type ModerationAction = "suspend" | "reinstate";
type MessageAction    = "remove" | "restore";
type ReportAction     = "review" | "dismiss" | "escalate";
type MemberAction     = "ban" | "unban";

function invalidateLounge(queryClient: ReturnType<typeof useQueryClient>, loungeId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-lounge-detail", loungeId] });
  queryClient.invalidateQueries({ queryKey: ["admin-lounges-list"] });
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const MODERATION_MESSAGE: Record<ModerationAction, string> = {
  suspend:   "Lounge suspended.",
  reinstate: "Lounge reinstated.",
};

export interface CreateLoungeInput {
  name: string;
  description?: string;
  rules?: string[];
  slowModeSeconds?: number;
  maxMessageLength?: number;
}

export function useCreateLounge(onCreated: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoungeInput) => api.post("/api/admin/lounges", input),
    onSuccess: () => {
      toast.success("Lounge created.");
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-list"] });
      onCreated();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to create lounge.")),
  });
}

export function useModerateLounge(loungeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: ModerationAction; reason?: string }) =>
      api.patch(`/api/admin/lounges/${loungeId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(MODERATION_MESSAGE[variables.action]);
      invalidateLounge(queryClient, loungeId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update lounge.")),
  });
}

export function useDeleteLounge(loungeId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmName: string }) =>
      api.delete(`/api/admin/lounges/${loungeId}`, { data: input }),
    onSuccess: () => {
      toast.success("Lounge permanently deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete lounge.")),
  });
}

export function useLoungeMessageAction(loungeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: string; action: MessageAction; reason?: string }) =>
      api.patch(`/api/admin/lounges/${loungeId}/messages/${input.messageId}`, {
        action: input.action, reason: input.reason,
      }),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === "remove" ? "Message removed." : "Message restored.");
      queryClient.invalidateQueries({ queryKey: ["admin-lounge-messages", loungeId] });
      invalidateLounge(queryClient, loungeId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update message.")),
  });
}

const REPORT_ACTION_PAST_TENSE: Record<ReportAction, string> = {
  review:   "reviewed",
  dismiss:  "dismissed",
  escalate: "escalated",
};

export function useLoungeReportAction(loungeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: string; reportId: string; action: ReportAction; note?: string }) =>
      api.patch(`/api/admin/lounges/${loungeId}/reports`, input),
    onSuccess: (_data, variables) => {
      toast.success(`Report ${REPORT_ACTION_PAST_TENSE[variables.action]}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-lounge-reports", loungeId] });
      invalidateLounge(queryClient, loungeId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update report.")),
  });
}

export function useLoungeMemberAction(loungeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; action: MemberAction; reason?: string }) =>
      api.patch(`/api/admin/lounges/${loungeId}/members/${input.memberId}`, {
        action: input.action, reason: input.reason,
      }),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === "ban" ? "Member banned." : "Member unbanned.");
      queryClient.invalidateQueries({ queryKey: ["admin-lounge-members", loungeId] });
      invalidateLounge(queryClient, loungeId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update member.")),
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type ModerationAction = "remove" | "restore" | "feature" | "unfeature" | "set_access";
type ReportAction  = "review" | "dismiss" | "escalate";
type CommentAction = "remove" | "restore";

function invalidatePost(queryClient: ReturnType<typeof useQueryClient>, postId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-post-detail", postId] });
  queryClient.invalidateQueries({ queryKey: ["admin-posts-list"] });
}

const MODERATION_ACTION_MESSAGE: Record<ModerationAction, string> = {
  remove:     "Post removed.",
  restore:    "Post restored.",
  feature:    "Post featured.",
  unfeature:  "Post unfeatured.",
  set_access: "Post access updated.",
};

export function useModeratePost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: ModerationAction; reason?: string; access?: "free" | "paid" }) =>
      api.patch(`/api/admin/posts/${postId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(MODERATION_ACTION_MESSAGE[variables.action]);
      invalidatePost(queryClient, postId);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message ?? "Failed to update post.");
    },
  });
}

export function useDeletePost(postId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmSlug: string }) =>
      api.delete(`/api/admin/posts/${postId}`, { data: input }),
    onSuccess: () => {
      toast.success("Post permanently deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-posts-list"] });
      onDeleted();
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message ?? "Failed to delete post.");
    },
  });
}

const REPORT_ACTION_PAST_TENSE: Record<ReportAction, string> = {
  review:   "reviewed",
  dismiss:  "dismissed",
  escalate: "escalated",
};

export function useReportAction(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reportId: string; action: ReportAction; note?: string }) =>
      api.patch(`/api/admin/posts/${postId}/reports`, input),
    onSuccess: (_data, variables) => {
      toast.success(`Report ${REPORT_ACTION_PAST_TENSE[variables.action]}.`);
      invalidatePost(queryClient, postId);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message ?? "Failed to update report.");
    },
  });
}

export function useCommentAction(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: string; action: CommentAction; reason?: string }) =>
      api.patch(`/api/admin/posts/${postId}/comments/${input.commentId}`, {
        action: input.action, reason: input.reason,
      }),
    onSuccess: (_data, variables) => {
      toast.success(`Comment ${variables.action}d.`);
      queryClient.invalidateQueries({ queryKey: ["admin-post-comments", postId] });
      invalidatePost(queryClient, postId);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message ?? "Failed to update comment.");
    },
  });
}

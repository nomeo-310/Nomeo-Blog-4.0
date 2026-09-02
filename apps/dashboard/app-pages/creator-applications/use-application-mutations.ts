"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type ReviewAction = "approve" | "reject";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

const ACTION_MESSAGE: Record<ReviewAction, string> = {
  approve: "Application approved — the applicant is now a creator.",
  reject:  "Application rejected.",
};

export function useReviewApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: ReviewAction; note?: string }) =>
      api.patch(`/api/admin/creators/applications/${applicationId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(ACTION_MESSAGE[variables.action]);
      queryClient.invalidateQueries({ queryKey: ["admin-applications-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-creators-list"] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to review application.")),
  });
}

export interface BulkReviewApplicationsInput {
  ids: string[];
  action: ReviewAction;
  note?: string;
}

export function useBulkReviewApplications(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkReviewApplicationsInput) => {
      const { data } = await api.post<{ requested: number; updated: number }>("/api/admin/creators/applications/bulk", input);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.action === "approve"
          ? `Approved ${data.updated} application(s) — the applicants are now creators.`
          : `Rejected ${data.updated} application(s).`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-applications-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-creators-list"] });
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to process bulk action.")),
  });
}

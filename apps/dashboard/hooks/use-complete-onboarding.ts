"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export interface CompleteOnboardingInput {
  newPassword: string;
  confirmPassword: string;
  displayName?: string;
  avatar?: string;
}

export function useCompleteOnboarding(onDone: () => void) {
  return useMutation({
    mutationFn: (input: CompleteOnboardingInput) => api.post("/api/admin/complete-onboarding", input),
    onSuccess: () => {
      toast.success("Setup complete. Welcome to the team!");
      onDone();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to complete setup.")),
  });
}

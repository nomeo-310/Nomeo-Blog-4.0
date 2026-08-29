"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";

export interface OnboardingStatus {
  isOnboarded: boolean;
  isActive: boolean;
  displayName: string;
}

async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>("/api/admin/onboarding-status");
  return data;
}

/** Polls lightly so a just-completed onboarding (or a suspend/reactivate) reflects without a manual refresh. */
export function useOnboardingStatus() {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-onboarding-status"],
    queryFn:  fetchOnboardingStatus,
    staleTime: 15_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
  });
}

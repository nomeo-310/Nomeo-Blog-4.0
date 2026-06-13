"use client";

import { useOnboardingModal } from "@/stores/modal-store";
import { useEffect } from "react";
import OnboardingModal from "./onboarding-modal";

/**
 * OnboardingGate
 * --------------
 * Bridges the server-computed `needsOnboarding` boolean to the onboarding
 * modal. Mount it once in a layout, passing the boolean and the curated
 * topic list (both resolved on the server).
 *
 * The modal is non-dismissable; it closes itself after completeOnboarding()
 * succeeds and then does a full navigation, so the gate won't reopen it
 * (needsOnboarding becomes false on the next load).
 */

interface TopicOption {
  slug: string;
  label: string;
  icon?: string;
}

interface OnboardingGateProps {
  needsOnboarding: boolean;
  topics: TopicOption[];
  /** Resume support — from Profile.onboardingStep */
  initialStepIndex?: number;
  /** Prefill — generated username + display name from the profile */
  defaults?: { username?: string; displayName?: string };
}

export default function OnboardingGate({
  needsOnboarding,
  topics,
  initialStepIndex = 0,
  defaults,
}: OnboardingGateProps) {
  const { isOpen, open, close } = useOnboardingModal();

  useEffect(() => {
    if (needsOnboarding) open();
  }, [needsOnboarding, open]);

  // Don't render the modal at all when onboarding isn't needed
  if (!needsOnboarding && !isOpen) return null;

  return (
    <OnboardingModal
      isOpen={isOpen}
      onComplete={close}
      topics={topics}
      initialStepIndex={initialStepIndex}
      defaults={defaults}
    />
  );
}
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import { useAuthModal } from "@/stores/modal-store";
import { PlanOption, usePlans } from "@/hooks/use-plans";
import { useSubscription } from "@/hooks/use-subscription";
import MembershipPaymentModal from "./membership-payment-modal";
import { saveRedirectIntent } from "@/lib/redirect-storage";
import { MembershipHeader } from "./membership-header";
import { MembershipBanner } from "./membership-banner";
import { MembershipPlanSelector } from "./membership-plan-selector";
import { MembershipPlanDetails } from "./membership-plan-details";
import { MembershipSkeleton } from "./membership-skeleton";

/**
 * MembershipPage — Nomeo.
 *
 * Two-column layout: plan pills on mobile, cards on desktop (left), selected plan details on the right (2/3 width).
 * Shows the paid membership plans and their benefits. Readers start with NO
 * subscription (free reading + credits); becoming a member is a conscious
 * action taken here. Picking a plan opens the payment modal → Paystack →
 * subscription activation.
 *
 * Owns all page state (selected plan, payment-modal visibility) and the
 * top-level composition; rendering of each section is delegated to sibling
 * files in this folder (membership-header, membership-banner,
 * membership-plan-selector, membership-plan-details, membership-skeleton).
 */

export default function MembershipPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { open: openAuth, setMode } = useAuthModal();

  const { plans, isLoading, isError, refetch } = usePlans();
  const { subscription, isActive, isLoading: subLoading } = useSubscription();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payingPlan, setPayingPlan] = useState<PlanOption | null>(null);

  const isLoggedIn = !!session;

  // Default selection: the highlighted (recommended) plan, else the first.
  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans]
  );
  const effectiveSelected = selectedId ?? orderedPlans.find((p) => p.isHighlighted)?.id ?? orderedPlans[0]?.id ?? null;
  const selectedPlan = orderedPlans.find((p) => p.id === effectiveSelected) ?? null;

  const handleSubscribe = (plan: PlanOption) => {
    if (!isLoggedIn) {
      saveRedirectIntent();
      setMode("sign-in");
      openAuth();
      return;
    }
    if (isActive) {
      router.push("/dashboard/payments");
      return;
    }
    setPayingPlan(plan);
  };

  if (isLoading || subLoading) return <MembershipSkeleton />;

  if (isError) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load membership plans.</p>
        <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        <MembershipHeader />

        {isActive && subscription && (
          <MembershipBanner subscription={subscription} onManage={() => router.push("/dashboard/subscription")} />
        )}

        {/* Two-column layout with vertical center alignment */}
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center">
          <MembershipPlanSelector plans={orderedPlans} selectedId={effectiveSelected} onSelect={setSelectedId} />
          <MembershipPlanDetails
            plan={selectedPlan}
            isLoggedIn={isLoggedIn}
            isActive={isActive}
            onSubscribe={handleSubscribe}
          />
        </div>
      </div>

      {/* Payment modal */}
      {payingPlan && session?.user && (
        <MembershipPaymentModal
          plan={payingPlan}
          userEmail={session.user.email}
          userName={session.user.name ?? ""}
          onClose={() => setPayingPlan(null)}
          onSuccess={() => {
            setPayingPlan(null);
            router.push("/dashboard/payments");
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { useAuthModal } from "@/stores/modal-store";
import { PlanOption, usePlans } from "@/hooks/use-plans";
import { useSubscription } from "@/hooks/use-subscription";
import MembershipPaymentModal from "./membership-payment-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { saveRedirectIntent } from "@/lib/redirect-storage";

/**
 * MembershipPage — Nomeo.
 *
 * Two-column layout: plan pills on mobile, cards on desktop (left), selected plan details on the right (2/3 width).
 * Shows the paid membership plans and their benefits. Readers start with NO
 * subscription (free reading + credits); becoming a member is a conscious
 * action taken here. Picking a plan opens the payment modal → Paystack →
 * subscription activation.
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
      router.push("/dashboard/subscription");
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
        {/* Header */}
        <header className="mx-auto max-w-3xl pt-16 pb-12 text-center md:pt-20 md:pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Membership</p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Read without limits.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            You can read free posts and a few paid ones on us. Become a member
            for unlimited access — and to support the writers you love through
            the earnings pool.
          </p>
        </header>

        {/* Active-subscription banner */}
        {isActive && subscription && (
          <div className="mx-auto mb-10 max-w-5xl rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-sm font-medium text-foreground">
              You&apos;re a {subscription.interval} member — renews in {subscription.daysUntilRenewal} days.
            </p>
            <button
              onClick={() => router.push("/dashboard/subscription")}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Manage your membership
            </button>
          </div>
        )}

        {/* Two-column layout with vertical center alignment */}
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center">
          {/* Left column - Plan pills (mobile) / Cards (desktop) */}
          <div className="lg:w-1/3">
            {/* Mobile: Horizontal scrollable pills */}
            <div className="lg:hidden">
              <div className="flex flex-wrap gap-2">
                {orderedPlans.map((plan) => (
                  <PlanPill
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === effectiveSelected}
                    onSelect={() => setSelectedId(plan.id)}
                  />
                ))}
              </div>
            </div>

            {/* Desktop: Vertical cards */}
            <div className="hidden lg:block">
              <div className="space-y-3">
                {orderedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === effectiveSelected}
                    onSelect={() => setSelectedId(plan.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Selected plan details */}
          <div className="lg:w-2/3">
            {selectedPlan ? (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-card-foreground md:text-3xl">
                        {selectedPlan.name}
                      </h2>
                      {selectedPlan.isHighlighted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <Sparkles className="h-3 w-3" /> Best value
                        </span>
                      )}
                    </div>
                    {selectedPlan.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedPlan.description}</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-4xl font-bold tracking-tight text-card-foreground">
                      {selectedPlan.priceFormatted}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedPlan.perMonthFormatted}/mo
                      {selectedPlan.savingsPercent > 0 && (
                        <span className="ml-2 text-primary">· save {selectedPlan.savingsPercent}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full benefits */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {selectedPlan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className={cn(f.isHighlighted ? "text-card-foreground" : "text-muted-foreground")}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8">
                  <button
                    onClick={() => handleSubscribe(selectedPlan)}
                    disabled={!selectedPlan.isPurchasable}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
                  >
                    <Sparkles className="h-4 w-4" />
                    {!isLoggedIn
                      ? "Sign in to subscribe"
                      : isActive
                      ? "Manage membership"
                      : `Subscribe — ${selectedPlan.priceFormatted}`}
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
                    Cancel anytime. Billed {selectedPlan.interval}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
                <p className="text-sm text-muted-foreground">Select a plan to see details</p>
              </div>
            )}
          </div>
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
            router.push("/dashboard/subscription");
          }}
        />
      )}
    </div>
  );
}

/* Desktop Plan Card component */
function PlanCard({ plan, selected, onSelect }: { plan: PlanOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.01]",
        selected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-heading text-base font-bold text-card-foreground">{plan.name}</p>
          {plan.isHighlighted && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              <Sparkles className="h-2.5 w-2.5" /> Best
            </span>
          )}
        </div>
        {plan.savingsPercent > 0 ? (
          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Save {plan.savingsPercent}%
          </span>
        ) : plan.interval === "monthly" ? (
          <span className="text-[10px] text-muted-foreground">Monthly</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-card-foreground">{plan.priceFormatted}</span>
        <span className="text-xs text-muted-foreground">/ {plan.perMonthFormatted}/mo</span>
      </div>
    </button>
  );
}

/* Mobile Plan Pill component */
function PlanPill({ plan, selected, onSelect }: { plan: PlanOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
      )}
    >
      <span>{plan.name}</span>
      {plan.isHighlighted && (
        <Sparkles className={cn("h-3 w-3", selected ? "text-primary-foreground" : "text-primary")} />
      )}
      <span className={cn("text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {plan.priceFormatted}
      </span>
    </button>
  );
}

/* Skeleton loader - Using shadcn/ui Skeleton components with responsive layout */
function MembershipSkeleton() {
  return (
    <div className="w-full bg-background pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header skeleton */}
        <div className="mx-auto max-w-3xl pt-16 pb-12 text-center md:pt-20 md:pb-16">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto mt-4 h-10 w-3/4 md:h-12" />
          <Skeleton className="mx-auto mt-4 h-16 w-full max-w-2xl" />
        </div>

        {/* Two-column skeleton layout with center alignment */}
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center">
          {/* Left column skeleton - Different for mobile/desktop */}
          <div className="lg:w-1/3">
            {/* Mobile pill skeletons */}
            <div className="lg:hidden">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            </div>
            
            {/* Desktop card skeletons */}
            <div className="hidden lg:block">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Details card skeleton */}
          <div className="lg:w-2/3">
            <Skeleton className="h-[500px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
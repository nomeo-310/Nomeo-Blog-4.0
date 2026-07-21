import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Sparkles } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { PlanOption } from "@/hooks/use-plans";

/** Right column — full benefits + CTA for the currently selected plan. */
export function MembershipPlanDetails({ plan, isLoggedIn, isActive, onSubscribe }: {
  plan: PlanOption | null;
  isLoggedIn: boolean;
  isActive: boolean;
  onSubscribe: (plan: PlanOption) => void;
}) {
  return (
    <div className="lg:w-2/3">
      {plan ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-card-foreground md:text-3xl">
                  {plan.name}
                </h2>
                {plan.isHighlighted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <HugeiconsIcon icon={Sparkles} className="h-3 w-3" /> Best value
                  </span>
                )}
              </div>
              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <div className="text-4xl font-bold tracking-tight text-card-foreground">
                {plan.priceFormatted}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {plan.perMonthFormatted}/mo
                {plan.savingsPercent > 0 && (
                  <span className="ml-2 text-primary">· save {plan.savingsPercent}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Full benefits */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className={cn(f.isHighlighted ? "text-card-foreground" : "text-muted-foreground")}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8">
            <button
              onClick={() => onSubscribe(plan)}
              disabled={!plan.isPurchasable}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
            >
              <HugeiconsIcon icon={Sparkles} className="h-4 w-4" />
              {!isLoggedIn
                ? "Sign in to subscribe"
                : isActive
                ? "Manage membership"
                : `Subscribe — ${plan.priceFormatted}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
              Cancel anytime. Billed {plan.interval}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">Select a plan to see details</p>
        </div>
      )}
    </div>
  );
}

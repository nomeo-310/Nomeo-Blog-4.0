import { HugeiconsIcon } from "@hugeicons/react";
import { Sparkles } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { PlanOption } from "@/hooks/use-plans";

/**
 * Left column — plan pills on mobile, plan cards on desktop.
 * Renders every plan and reports the picked id up via onSelect.
 */
export function MembershipPlanSelector({ plans, selectedId, onSelect }: {
  plans: PlanOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="lg:w-1/3">
      {/* Mobile: Horizontal scrollable pills */}
      <div className="lg:hidden">
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <PlanPill
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedId}
              onSelect={() => onSelect(plan.id)}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Vertical cards */}
      <div className="hidden lg:block">
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedId}
              onSelect={() => onSelect(plan.id)}
            />
          ))}
        </div>
      </div>
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
              <HugeiconsIcon icon={Sparkles} className="h-2.5 w-2.5" /> Best
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
        <HugeiconsIcon icon={Sparkles} className={cn("h-3 w-3", selected ? "text-primary-foreground" : "text-primary")} />
      )}
      <span className={cn("text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {plan.priceFormatted}
      </span>
    </button>
  );
}

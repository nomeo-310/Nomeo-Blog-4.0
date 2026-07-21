import { Check } from "lucide-react";
import type { PlanOption } from "@/hooks/use-plans";

/** Plan summary card + top benefits + total-due row inside the payment modal. */
export function MembershipPaymentSummary({ plan, priceDisplay }: { plan: PlanOption; priceDisplay: string }) {
  return (
    <>
      {/* Plan summary */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
        <div>
          <p className="text-sm font-semibold text-card-foreground">{plan.name}</p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">{plan.interval} billing</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-card-foreground">{plan.priceFormatted}</p>
          {plan.savingsPercent > 0 && (
            <p className="text-xs text-primary">Save {plan.savingsPercent}%</p>
          )}
        </div>
      </div>

      {/* Top benefits */}
      <div className="mt-4 space-y-1.5">
        {plan.features.slice(0, 4).map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-base font-semibold text-card-foreground">Total due</span>
        <span className="text-2xl font-bold text-card-foreground">{priceDisplay}</span>
      </div>
    </>
  );
}

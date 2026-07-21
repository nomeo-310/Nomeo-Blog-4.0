import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCard } from "@hugeicons/core-free-icons";
import type { PaymentRow } from "@/hooks/use-payments";
import { StatusBadge } from "./payments-status-badge";
import { formatDate } from "./payments-format";

/** A single payment history row — plan, amount, date, method, status. */
export function PaymentHistoryRow({ payment }: { payment: PaymentRow }) {
  return (
    <div className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1fr_120px_120px_100px_100px] sm:items-center sm:gap-4">
      {/* Plan */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {payment.plan?.name ?? "Nomeo Membership"}
        </p>
        <p className="text-xs text-muted-foreground">
          {payment.plan?.interval ? `Billed ${payment.plan.interval}` : "Subscription"}
          {" · "}
          <span className="font-mono text-[11px]">{payment.reference}</span>
        </p>
      </div>

      {/* Amount */}
      <p className="text-sm font-bold text-foreground">
        {payment.amountFormatted}
      </p>

      {/* Date */}
      <p className="text-xs text-muted-foreground">
        {payment.paidAt ? formatDate(payment.paidAt) : payment.createdAt ? formatDate(payment.createdAt) : "—"}
      </p>

      {/* Method */}
      <div className="flex items-center gap-1.5">
        <HugeiconsIcon icon={CreditCard} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground capitalize">
          {payment.channel ?? "—"}
          {payment.cardLast4 && ` ···${payment.cardLast4}`}
        </span>
      </div>

      {/* Status badge */}
      <StatusBadge status={payment.status} />
    </div>
  );
}

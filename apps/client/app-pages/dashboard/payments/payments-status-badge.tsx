import { RefreshCcw } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon, AlertCircle, Clock03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { PaymentGatewayStatus } from "@/hooks/use-payments";

/** Colored status pill for a payment row. */
export function StatusBadge({ status }: { status: PaymentGatewayStatus }) {
  const map: Record<PaymentGatewayStatus, { icon: React.ReactNode; cls: string; label: string }> = {
    success:   { icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3.5 w-3.5" />, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",    label: "Success"   },
    pending:   { icon: <HugeiconsIcon icon={Clock03Icon}       className="h-3.5 w-3.5" />, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending"   },
    failed:    { icon: <HugeiconsIcon icon={CancelCircleIcon}      className="h-3.5 w-3.5" />, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             label: "Failed"    },
    abandoned: { icon: <HugeiconsIcon icon={AlertCircle}  className="h-3.5 w-3.5" />, cls: "bg-muted text-muted-foreground",                                           label: "Abandoned" },
    reversed:  { icon: <RefreshCcw   className="h-3.5 w-3.5" />, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Reversed"  },
  };
  const { icon, cls, label } = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {icon}{label}
    </span>
  );
}

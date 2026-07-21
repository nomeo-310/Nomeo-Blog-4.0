import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { PaymentGatewayStatus } from "@/hooks/use-payments";

const STATUS_FILTERS: { key: PaymentGatewayStatus | "all"; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "success",   label: "Successful" },
  { key: "pending",   label: "Pending"   },
  { key: "failed",    label: "Failed"    },
  { key: "abandoned", label: "Abandoned" },
];

/** Status filter pill bar for the payments table. */
export function PaymentsFilterBar({ value, onChange }: {
  value: PaymentGatewayStatus | "all";
  onChange: (key: PaymentGatewayStatus | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground self-center">
        <HugeiconsIcon icon={FilterHorizontalIcon} className="h-3.5 w-3.5" /> Filter:
      </span>
      {STATUS_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === f.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-accent"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

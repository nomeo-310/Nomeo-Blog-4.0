import { cn } from "@/lib/utils";

interface AccessFieldProps {
  value: "free" | "paid";
  onChange: (value: "free" | "paid") => void;
  freeIcon: React.ReactNode;
  paidIcon: React.ReactNode;
}

/**
 * AccessField — free vs. members-only toggle. Shared by NewPostPage and
 * EditPostPage; only the icons differ between them.
 */
export function AccessField({ value, onChange, freeIcon, paidIcon }: AccessFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Access</p>
      <div className="flex gap-2">
        <button onClick={() => onChange("free")}
          className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
            value === "free" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
          {freeIcon} Free
        </button>
        <button onClick={() => onChange("paid")}
          className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
            value === "paid" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
          {paidIcon} Members only
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {value === "paid" ? "Only subscribers with an active membership can read this post." : "Everyone can read this post for free."}
      </p>
    </div>
  );
}

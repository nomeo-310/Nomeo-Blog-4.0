import { memo } from "react";

export const inputCls = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Labeled form field wrapper — label, optional hint, then the control. */
export const Field = memo(({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
    {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
    {children}
  </div>
));
Field.displayName = "Field";

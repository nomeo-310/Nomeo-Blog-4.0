import { cn } from "@/lib/utils";
import { FieldError } from "./post-field-error";

interface ExcerptFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorIcon: React.ReactNode;
  rows: number;
}

/**
 * ExcerptField — the required-to-publish excerpt textarea. Shared by
 * NewPostPage and EditPostPage; `rows` differs slightly between the two
 * (5 vs 3) so it's passed in rather than hardcoded.
 */
export function ExcerptField({ value, onChange, error, errorIcon, rows }: ExcerptFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        Excerpt <span className="ml-1 font-normal text-muted-foreground">(required to publish)</span>
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="A short summary readers will see in the feed…" rows={rows} maxLength={500}
        className={cn("w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
          error ? "border-destructive" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
      {error && <FieldError msg={error} icon={errorIcon} />}
      <p className="mt-1 text-right text-xs text-muted-foreground">{value.length}/500</p>
    </div>
  );
}

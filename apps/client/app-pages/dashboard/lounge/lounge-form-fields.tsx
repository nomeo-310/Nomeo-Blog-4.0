import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Add01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** Name field shared by new-lounge and edit-lounge forms. */
export function LoungeNameField({ name, onChange, error }: {
  name: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        Lounge name <span className="text-destructive">*</span>
      </label>
      <input
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. The Writers Room"
        maxLength={100}
        className={cn(
          "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
          error
            ? "border-destructive"
            : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
        )}
      />
      {error && <FieldError msg={error} />}
      <p className="mt-1 text-right text-xs text-muted-foreground">{name.length}/100</p>
    </div>
  );
}

/** Description field shared by new-lounge and edit-lounge forms. */
export function LoungeDescriptionField({ description, onChange, error }: {
  description: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
      <textarea
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What will people talk about in this lounge?"
        rows={3}
        maxLength={500}
        className={cn(
          "w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
          error
            ? "border-destructive"
            : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
        )}
      />
      {error && <FieldError msg={error} />}
      <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/500</p>
    </div>
  );
}

/** House-rules list editor shared by new-lounge and edit-lounge forms. */
export function LoungeRulesField({ rules, onAdd, onUpdate, onRemove }: {
  rules: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          House rules{" "}
          <span className="font-normal text-muted-foreground">
            ({rules.filter(Boolean).length}/20)
          </span>
        </p>
        <button
          onClick={onAdd}
          disabled={rules.length >= 20}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5" /> Add rule
        </button>
      </div>
      <div className="space-y-2.5">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <input
              value={rule}
              onChange={(e) => onUpdate(i, e.target.value)}
              placeholder={`Rule ${i + 1}…`}
              maxLength={200}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => onRemove(i)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label="Remove rule"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No rules yet. Add some to set expectations for your lounge.
        </p>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <HugeiconsIcon icon={AlertCircleIcon} className="h-3.5 w-3.5" />{msg}
    </p>
  );
}

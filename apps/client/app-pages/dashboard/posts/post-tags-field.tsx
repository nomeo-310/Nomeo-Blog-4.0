interface TagsFieldProps {
  tagInput: string;
  onTagInputChange: (value: string) => void;
  tags: string[];
  onAdd: () => void;
  onRemove: (tag: string) => void;
  addIcon: React.ReactNode;
  removeIcon: React.ReactNode;
}

/**
 * TagsField — tag input + chip list (max 10). Shared by NewPostPage and
 * EditPostPage; only the add/remove icons differ between them.
 */
export function TagsField({ tagInput, onTagInputChange, tags, onAdd, onRemove, addIcon, removeIcon }: TagsFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        Tags <span className="ml-1 font-normal text-muted-foreground">({tags.length}/10)</span>
      </label>
      <div className="flex gap-2">
        <input value={tagInput} onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onAdd(); } }}
          placeholder="e.g. tech, culture…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
        <button onClick={onAdd} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90">
          {addIcon}
        </button>
      </div>
      {tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              #{t}
              <button onClick={() => onRemove(t)} className="ml-0.5 rounded-full hover:text-destructive">
                {removeIcon}
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Press Enter or comma to add.</p>
    </div>
  );
}

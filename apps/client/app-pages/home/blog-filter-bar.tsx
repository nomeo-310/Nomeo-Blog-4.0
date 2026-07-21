import { Fire02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/** Category filter pills + newest/trending sort toggle. */
export function BlogFilterBar({
  categories, category, sort, onCategory, onSort,
}: {
  categories: string[];
  category: string;
  sort: string;
  onCategory: (cat: string) => void;
  onSort: (sort: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterPill label="All"  active={!category} onClick={() => onCategory("")} />
        {categories.map((cat) => (
          <FilterPill key={cat} label={cat} active={category === cat} onClick={() => onCategory(cat)} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
        <button
          onClick={() => onSort("newest")}
          className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            sort === "newest" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          Newest
        </button>
        <button
          onClick={() => onSort("trending")}
          className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            sort === "trending" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          <HugeiconsIcon icon={Fire02Icon} className="h-4 w-4" /> Trending
        </button>
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-foreground text-background"
          : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

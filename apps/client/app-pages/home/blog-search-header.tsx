import { Loader2 } from "lucide-react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/** Section title/description and the search input. */
export function BlogSearchHeader({
  query, loading, onSearch, onClear,
}: {
  query: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Blog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stories, ideas, and perspectives from Nomeo writers.
        </p>
      </div>

      {/* Search input — client-side, no form submission */}
      <div className="relative w-full sm:w-80">
        <div className={cn(
          "flex h-10 items-center gap-2 rounded-full border bg-card px-4 shadow-sm transition-colors",
          loading ? "border-primary/40" : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        )}>
          {loading
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            : <HugeiconsIcon icon={Search01Icon} className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search title, tag, author…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {query && (
            <button onClick={onClear} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground">
              <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Results for ..." label shown below the filter bar while a search is active. */
export function BlogActiveQueryLabel({ query, onClear }: { query: string; onClear: () => void }) {
  if (!query) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>Results for <span className="font-semibold text-foreground">"{query}"</span></span>
      <button onClick={onClear} className="font-semibold text-primary hover:underline">Clear</button>
    </div>
  );
}

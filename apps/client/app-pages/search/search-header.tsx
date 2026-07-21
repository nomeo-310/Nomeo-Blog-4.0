import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterKey } from "./search-types";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "All"     },
  { key: "story",  label: "Posts"   },
  { key: "author", label: "Writers" },
  { key: "tag",    label: "Tags"    },
  { key: "lounge", label: "Lounges" },
];

/** Collapsing heading + search input + (when active) filter pills. */
export function SearchHeader({
  query, onQueryChange, onClear, isActive, isFetching, onSubmit,
  filter, onFilterChange, counts, inputRef,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  isActive: boolean;
  isFetching: boolean;
  onSubmit: () => void;
  filter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  counts: Partial<Record<FilterKey, number>>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      {/* Heading — collapses when searching */}
      <div className={cn(
        "text-center select-none overflow-hidden transition-all duration-500 ease-out",
        isActive ? "max-h-0 opacity-0 mb-0" : "max-h-40 opacity-100 mb-1"
      )}>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">Nomeo</h1>
        <p className="mt-1 text-xs md:text-sm text-muted-foreground">Search stories, writers, and topics.</p>
      </div>

      {/* Search box */}
      <div className="relative w-full max-w-3xl rounded-full bg-card border border-border shadow-sm transition-all focus-within:border-foreground/30">
        <div className="flex items-center px-4 py-2.5 md:px-5 md:py-3 gap-3">
          {isFetching
            ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0 animate-spin" />
            : <HugeiconsIcon icon={Search01Icon}   className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && isActive && onSubmit()}
            placeholder="Search stories, authors, or topics…"
            className="w-full bg-transparent border-0 outline-none text-sm md:text-lg text-card-foreground placeholder:text-muted-foreground/60"
            autoFocus
          />
          {query && (
            <button type="button" onClick={onClear}
              aria-label="Clear search"
              className="p-1 rounded-full hover:bg-accent text-muted-foreground transition-colors shrink-0">
              <HugeiconsIcon icon={Cancel01Icon}  className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onSubmit} disabled={!isActive} aria-label="Search"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
              isActive ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95" : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            )}>
            <HugeiconsIcon icon={ArrowUp02Icon}  className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      {isActive && (
        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          {FILTERS.map(f => {
            const on = filter === f.key;
            return (
              <button key={f.key} type="button" onClick={() => onFilterChange(f.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs md:text-sm transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"
                )}>
                {f.label}
                {f.key !== "all" && (
                  <span className={cn("text-[10px] tabular-nums", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {counts[f.key] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

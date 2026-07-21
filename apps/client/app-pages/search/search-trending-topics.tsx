import { HugeiconsIcon } from "@hugeicons/react";
import { HashtagIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** Idle-state "Popular topics" pill list — collapses once a search is active. */
export function SearchTrendingTopics({
  isActive, tagsLoading, trendingTags, onTagSelect,
}: {
  isActive: boolean;
  tagsLoading: boolean;
  trendingTags: string[];
  onTagSelect: (tag: string) => void;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-3 max-w-2xl overflow-hidden transition-all duration-500 ease-out",
      isActive ? "max-h-0 opacity-0" : "max-h-72 opacity-100"
    )}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
        <HugeiconsIcon icon={HashtagIcon}  className="h-3.5 w-3.5" />
        <span>Popular topics</span>
      </div>

      {tagsLoading ? (
        /* Skeleton pills while fetching */
        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}
              className="h-7 rounded-full bg-muted animate-pulse"
              style={{ width: `${60 + (i * 11) % 50}px` }}
            />
          ))}
        </div>
      ) : trendingTags.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-md md:max-w-none">
          {trendingTags.map(tag => (
            <button key={tag} type="button"
              onClick={() => onTagSelect(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 md:px-3.5 md:py-1.5 text-xs md:text-sm text-foreground transition-colors hover:bg-accent hover:border-primary/30">
              <HugeiconsIcon icon={HashtagIcon}  className="h-3 w-3 text-primary shrink-0" />
              {tag}
            </button>
          ))}
        </div>
      ) : (
        /* Fallback if no tags yet */
        <p className="text-xs text-muted-foreground">No topics yet — check back once posts are published.</p>
      )}
    </div>
  );
}

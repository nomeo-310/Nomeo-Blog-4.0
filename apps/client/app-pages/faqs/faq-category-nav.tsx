import { cn } from "@/lib/utils";
import type { FaqCategory } from "./faqs";

interface FaqCategoryNavProps {
  categories: FaqCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

/** Left rail of category tabs — horizontal scroll on mobile, vertical list on desktop. */
export function FaqCategoryNav({ categories, activeId, onSelect }: FaqCategoryNavProps) {
  return (
    <nav
      aria-label="FAQ categories"
      className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-2 md:overflow-visible md:pb-0"
    >
      {categories.map((cat) => {
        const on = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            aria-current={on ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors md:shrink",
              on
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {cat.title}
          </button>
        );
      })}
    </nav>
  );
}

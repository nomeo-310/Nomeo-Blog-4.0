import { ArrowDown01 } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import type { FaqCategory } from "./faqs";

interface FaqAccordionProps {
  category: FaqCategory;
  openIndex: number | null;
  onToggle: (index: number) => void;
}

/**
 * Active category's title + its questions, rendered as an animated accordion.
 *
 * Keyed by `category.id` at the root so switching categories remounts this
 * block (resets the fade/slide-in animation) instead of just re-rendering it.
 */
export function FaqAccordion({ category, openIndex, onToggle }: FaqAccordionProps) {
  return (
    <div key={category.id} className="min-w-0 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">{category.title}</h2>
        {category.description && (
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        )}
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
        {category.items.map((item, i) => (
          <AccordionItem
            key={`${category.id}-${i}`}
            question={item.q}
            answer={item.a}
            isOpen={openIndex === i}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Accordion item (from scratch, animated) ────────────────────────────── */

function AccordionItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="text-sm font-medium text-card-foreground md:text-base">{question}</span>
        <HugeiconsIcon icon={ArrowDown01}
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Animated region: grid 0fr → 1fr expands to content height smoothly */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  );
}

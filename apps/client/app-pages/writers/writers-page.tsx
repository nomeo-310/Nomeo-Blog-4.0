"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon } from "@hugeicons/core-free-icons";
import type { TopWriter } from "@/lib/get-top-writers";
import { WriterCard } from "./writer-card";
import { WriterDetailModal } from "./writer-detail-modal";

/**
 * WritersPage — the /writers directory: QuilHub's top writers by followers,
 * each a flip card (front: identity, back: bio + paid/free counts) that
 * opens an XL detail modal with the writer's full paid and free post
 * lists, linked straight into each post.
 *
 * Full-width max-w-7xl container to match the rest of the site (home,
 * search, about, membership) — narrower than that reads as inconsistent
 * next to every other page.
 *
 * Component: app-pages/writers/writers-page.tsx
 * Route:     app/(root)/writers/page.tsx
 */
export default function WritersPage({ writers }: { writers: TopWriter[] }) {
  const [selected, setSelected] = useState<TopWriter | null>(null);

  return (
    <div className="mx-auto w-full px-4 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Top writers
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The voices that make QuilHub worth reading. Hover a card for a quick look, or open it for their full paid and free stories.
        </p>
      </div>

      {writers.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-8 w-8 text-muted-foreground/30" />
          <h3 className="mt-4 font-heading text-base font-bold text-foreground">No writers yet</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Check back soon — new writers join QuilHub all the time.</p>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {writers.map((w) => (
            <WriterCard key={w.username} writer={w} onViewDetails={() => setSelected(w)} />
          ))}
        </div>
      )}

      <WriterDetailModal writer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

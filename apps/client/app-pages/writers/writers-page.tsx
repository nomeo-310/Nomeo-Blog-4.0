import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon } from "@hugeicons/core-free-icons";
import type { TopWriter } from "@/lib/get-top-writers";
import { WriterCard } from "./writer-card";

/**
 * WritersPage — the /writers directory: Nomeo's top writers by followers,
 * each with their paid and free posts categorized and linked. Server
 * Component — data comes from getTopWriters() in the route (app/(root)/writers/page.tsx).
 *
 * Component: app-pages/writers/writers-page.tsx
 * Route:     app/(root)/writers/page.tsx
 */
export default function WritersPage({ writers }: { writers: TopWriter[] }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Top writers
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The voices that make Nomeo worth reading — with their paid and free stories, so you can jump straight in.
        </p>
      </div>

      {writers.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-8 w-8 text-muted-foreground/30" />
          <h3 className="mt-4 font-heading text-base font-bold text-foreground">No writers yet</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Check back soon — new writers join Nomeo all the time.</p>
        </div>
      ) : (
        <div className="mt-12 space-y-5">
          {writers.map((w) => (
            <WriterCard key={w.username} writer={w} />
          ))}
        </div>
      )}
    </div>
  );
}

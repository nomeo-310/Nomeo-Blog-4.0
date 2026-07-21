import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

/** Origin-story blurb + final "Pull up a seat" call to action. */
export function AboutClosing() {
  return (
    <>
      {/* ── Origin note ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-8 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium leading-relaxed text-foreground">
          Nomeo started with a simple frustration: the best part of reading something good is talking about
          it — and almost nowhere lets you do both in the same place. So we built a home where the writing
          and the conversation sit side by side.
        </p>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-0">
        <div className="relative w-full overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 px-6 py-14 text-center sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Pull up a seat.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Read something that moves you, then say so out loud. The conversation is already happening —
              come find your room.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/lounges" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Browse lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                Explore writing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

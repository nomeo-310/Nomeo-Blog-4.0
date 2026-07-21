import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

/** Top hero — headline, subhead, and primary CTAs. */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 md:pt-28 md:pb-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">About Nomeo</p>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          The story doesn&apos;t end at the last paragraph.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Nomeo is where writing and conversation live together. Read a piece,
          then step into the lounge beside it — where the people who care about
          the same things are already talking.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/lounges"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Explore the lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Start reading
          </Link>
        </div>
      </div>
    </section>
  );
}

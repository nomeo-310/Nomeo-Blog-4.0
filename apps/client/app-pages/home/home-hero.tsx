import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";

/** Shown when the site has zero published posts yet — no slides for HeroCarousel to render. */
export function EmptyHero({ user }: { user?: any }) {
  return (
    <div className="relative mt-6 flex h-[70vh] min-h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl bg-primary/20 lg:min-h-[550px] xl:min-h-[650px]">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl" style={{ animationDelay: "1s" }} />
      </div>
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <HugeiconsIcon icon={Edit01Icon} className="h-12 w-12 text-primary/60" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">Welcome to Nomeo</p>
        <h1 className="mt-4 font-heading text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
          Stories worth reading.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          The first published post will appear here. Start your writing journey today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user?.role === "creator" && (
            <Link href="/dashboard/posts/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" /> Write your first story
            </Link>
          )}
          <Link href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent">
            Learn more <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { RefreshCw, Home, TriangleAlertIcon } from "lucide-react";

/**
 * ErrorContent — shared fallback UI for app/error.tsx and app/global-error.tsx.
 *
 * Styled to match NotFoundContent (components/features/not-found-content.tsx):
 * oversized ghost glyph behind the copy, centered card, primary/secondary
 * actions. Kept dependency-light (no session check, no data fetching) since
 * it has to render reliably even when something upstream is broken.
 */
export function ErrorContent({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="relative flex min-h-[calc(100vh-var(--nav-h,4rem))] w-full items-center justify-center overflow-hidden bg-background px-4">
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-heading text-[28vw] font-bold leading-none tracking-tighter text-primary/5 md:text-[20rem]"
      >
        !
      </span>

      <div className="relative z-10 mx-auto max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlertIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-primary">Something went wrong</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          That wasn&apos;t supposed to happen.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          We&apos;ve logged the error and will look into it. Try again, or head back home if it keeps happening.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

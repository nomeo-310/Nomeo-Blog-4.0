"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, LayoutDashboard, Search } from "lucide-react";
import { authClient } from "@/lib/authClient";

/**
 * NotFoundContent — the auth-aware part of the 404 page.
 *
 * Rendered by the server `not-found.tsx`. Checks session on the client and
 * points the primary action to the right home:
 *   - logged in  → Dashboard
 *   - logged out → Front page
 *
 * Styled to match the app (forest-green tokens, Quicksand/Urbanist). No image —
 * a large typographic "404" and a calm, helpful layout instead.
 */
export default function NotFoundContent() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = !!session;

  const primaryHref = isLoggedIn ? "/dashboard" : "/";
  const primaryLabel = isLoggedIn ? "Back to dashboard" : "Back home";
  const PrimaryIcon = isLoggedIn ? LayoutDashboard : Home;

  return (
    <main className="relative flex min-h-[calc(100vh-var(--nav-h,4rem))] w-full items-center justify-center overflow-hidden bg-background px-4">
      {/* Oversized ghost numerals behind the content */}
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-heading text-[34vw] font-bold leading-none tracking-tighter text-primary/5 md:text-[24rem]"
      >
        404
      </span>

      <div className="relative z-10 mx-auto max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Page not found</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          This page wandered off.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link may be broken, or the page may have been moved or removed.
          Let&apos;s get you back to something worth reading.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <PrimaryIcon className="h-4 w-4" />
            {/* Avoid a flash before session resolves: neutral label while pending */}
            {isPending ? "Take me home" : primaryLabel}
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>

        {/* Secondary helpers */}
        <div className="mt-8 flex items-center justify-center gap-5 text-sm">
          <Link href="/search" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary">
            <Search className="h-3.5 w-3.5" />
            Search
          </Link>
          <span className="h-3 w-px bg-border" />
          <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
            Discover
          </Link>
          <span className="h-3 w-px bg-border" />
          <Link href="/faqs#contact" className="text-muted-foreground transition-colors hover:text-primary">
            Contact
          </Link>
        </div>
      </div>
    </main>
  );
}
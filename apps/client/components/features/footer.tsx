"use client";

import { useState } from "react";
import Link from "next/link";
import { useLegalModal, type LegalDocType } from "@/stores/modal-store";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Footer — Nomeo.
 *
 * Matches the Navbar's design: "Nomeo" wordmark, forest-green tokens,
 * Quicksand body + Urbanist headings. Full-width band, contained inner.
 *
 * Layout:
 *   1. Newsletter band  — headline + email signup (double opt-in)
 *   2. Link columns     — brand, Explore, Company, Legal
 *   3. Bottom bar       — copyright
 *
 * Legal links open the LegalModal rather than navigating.
 */

const EXPLORE_LINKS = [
  { label: "Discover", href: "/" },
  { label: "Lounge", href: "/lounge" },
  { label: "Membership", href: "/membership" },
  { label: "Search", href: "/search" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Subscription", href: "/membership" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/faqs#contact" },
];

const LEGAL_LINKS: { label: string; doc: LegalDocType }[] = [
  { label: "Terms of Service", doc: "terms" },
  { label: "Privacy Policy", doc: "privacy" },
  { label: "Data Protection", doc: "data" },
  { label: "Community Guidelines", doc: "guidelines" },
  { label: "Cookie Policy", doc: "cookie" as LegalDocType },
];

export default function Footer() {
  const { open: openLegal } = useLegalModal();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* ── Newsletter band ────────────────────────────────────────── */}
        <NewsletterBand />

        {/* ── Link columns ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-12 lg:py-16">
          {/* Brand block — left */}
          <div className="md:col-span-4 lg:col-span-5">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
            >
              Nomeo
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A home for long-form writing. Read the voices you love, support
              them directly, and publish stories worth someone&apos;s time.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialLink href="https://x.com/nomeo" label="X (Twitter)"><XIcon /></SocialLink>
              <SocialLink href="https://instagram.com/nomeo" label="Instagram"><InstagramIcon /></SocialLink>
              <SocialLink href="https://linkedin.com/company/nomeo" label="LinkedIn"><LinkedInIcon /></SocialLink>
            </div>
          </div>

          {/* Link columns — grouped on the right.
              Mobile: 3 across (compact). Desktop: pushed to the right half. */}
          <div className="grid grid-cols-3 gap-8 md:col-span-8 lg:col-span-7">
            <div>
              <FooterHeading>Explore</FooterHeading>
              <ul className="mt-4 space-y-2.5">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.label}><FooterLink href={l.href}>{l.label}</FooterLink></li>
                ))}
              </ul>
            </div>

            <div>
              <FooterHeading>Company</FooterHeading>
              <ul className="mt-4 space-y-2.5">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}><FooterLink href={l.href}>{l.label}</FooterLink></li>
                ))}
              </ul>
            </div>

            <div>
              <FooterHeading>Legal</FooterHeading>
              <ul className="mt-4 space-y-2.5">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.doc}>
                    <button
                      type="button"
                      onClick={() => openLegal(l.doc)}
                      className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} Nomeo Consults Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for readers and writers — Lagos, Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── Newsletter band ────────────────────────────────────────────────────── */

function NewsletterBand() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setStatus("idle");
        return;
      }
      setStatus("done");
      toast.success(data.message || "Almost there — check your inbox to confirm.");
      setEmail("");
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  };

  return (
    <div className="grid grid-cols-1 items-center gap-6 border-b border-border py-10 md:grid-cols-2 lg:py-12">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Stay in the loop.
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Get the best new stories, writer spotlights, and what&apos;s worth
          reading — delivered occasionally, never spammy.
        </p>
      </div>

      <div className="md:justify-self-end md:w-full md:max-w-md">
        {status === "done" ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <Check className="h-4 w-4 text-primary" />
            Check your inbox to confirm your subscription.
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
      {children}
    </h3>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external) {
    return (
      <a
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
    >
      {children}
    </a>
  );
}

/* ── Social icons ───────────────────────────────────────────────────────── */

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}
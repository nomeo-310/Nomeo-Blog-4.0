"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "../ui/theme-toggle";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { Button } from "../ui/button";
import { useAuthModal } from "@/stores/modal-store";
import { userProps } from "../auth/nav-user-type";
import { signOut } from "@/lib/authClient";

/**
 * Navbar — Nomeo blog navigation.
 *
 * Uses your shadcn design tokens (primary = forest green, plus
 * foreground / muted-foreground / accent / border / popover). No hardcoded
 * colors — themes automatically with light/dark.
 *
 * Layout:
 *   [ Nomeo ]      [ Discover  About  Lounge  Membership ]      [ theme • search • auth ]
 *
 * Behaviour:
 *   - Active route gets an animated underline bar in the primary color.
 *   - Dashboard menu item appears only when logged in.
 *   - Logged-out → "Sign in" + "Sign up" buttons that open auth modals.
 *   - Logged-in  → notification bell (unread dot) + avatar menu + logout pill.
 *   - Theme toggle sits before the search field.
 *   - Search is an input-like field linking to /search.
 *   - Mobile: full-height slide-in sidebar with logout pinned to the bottom.
 *   - Hides on scroll DOWN, reveals on scroll UP (always shown near the top).
 *
 * All interactive controls share a 40px (h-10) height for a clean row.
 */

interface NavbarProps {
  isAuthenticated?: boolean;
  user?: userProps;
  unreadNotifications?: number;
}

const NAV_ITEMS = [
  { label: "Discover", href: "/" },
  { label: "About", href: "/about" },
  { label: "Lounge", href: "/lounge" },
  { label: "Membership", href: "/membership" },
];

/** Only shown when the user is logged in */
const AUTHED_NAV_ITEMS = [{ label: "Dashboard", href: "/dashboard" }];

export default function Navbar({ isAuthenticated = false, user, unreadNotifications = 0 }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hidden = useScrollDirection();
  
  // Auth modal store actions
  const { open: openAuthModal, setMode: setAuthMode } = useAuthModal();

  // Portals can only render on the client
  useEffect(() => setMounted(true), []);

  // Keep the navbar visible while the mobile menu is open, even mid-scroll
  const isHidden = hidden && !mobileOpen;

  // Lock background scroll while the mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Dashboard only appears when logged in
  const navItems = isAuthenticated ? [...NAV_ITEMS, ...AUTHED_NAV_ITEMS] : NAV_ITEMS;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Auth modal handlers
  const handleSignIn = () => {
    setAuthMode("sign-in");
    openAuthModal();
  };

  const handleSignUp = () => {
    setAuthMode("sign-up");
    openAuthModal();
  };

  // Use either prop user or store user
  const currentUser = user;

  const handleSignOut = async () => {
    await signOut();
    window.location.reload()
  }

  return (
    <>
    <header
      className={`sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-transform duration-300 ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* ── Left: wordmark ───────────────────────────────────────────── */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          Nomeo
        </Link>

        {/* ── Center: menu (desktop) ───────────────────────────────────── */}
        <ul className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-px left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ${
                      active ? "w-6 opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── Right: theme + search + auth/account ─────────────────────── */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Search — input-like field (sm and up) */}
          <Link
            href="/search"
            aria-label="Search"
            className="hidden h-10 items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex sm:w-44 lg:w-56"
          >
            <SearchIcon />
            <span className="text-sm">Search…</span>
          </Link>

          {/* Search — compact icon on the smallest screens */}
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            <SearchIcon />
          </Link>

          {isAuthenticated && currentUser ? (
            <>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <BellIcon />
                {unreadNotifications > 0 && (
                  <span className="absolute right-2 top-2 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  aria-label="Account menu"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30"
                >
                  {currentUser.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg">
                    <div className="border-b border-border px-4 py-2.5">
                      <p className="truncate text-sm font-medium text-popover-foreground">{currentUser.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{currentUser.username}</p>
                    </div>
                    <MenuLink href={`/${currentUser.username}`}>Profile</MenuLink>
                    <MenuLink href="/settings">Settings</MenuLink>
                    <MenuLink href="/saved">Saved posts</MenuLink>
                    <form action="/api/auth/sign-out" method="post">
                      <button
                        type="submit"
                        className="w-full px-4 py-2 text-left text-sm text-destructive transition-colors hover:bg-accent"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Logout pill — desktop, beside the avatar (theme-aware color) */}
              <Button
                onClick={() => handleSignOut()}
                type="submit"
                variant="outline"
                className="h-10 gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground capitalize transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogoutIcon />
                Logout
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="outline"
                onClick={handleSignIn}
                className="h-10 rounded-full px-4 text-sm font-medium capitalize"
              >
                Sign in
              </Button>
              <Button
                onClick={handleSignUp}
                className="h-10 rounded-full px-4 text-sm font-semibold capitalize"
              >
                Sign up
              </Button>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent md:hidden"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>
    </header>

    {/* ── Mobile sidebar — rendered via portal to <body> so the overlay
        covers the FULL viewport, escaping the header's stacking context ── */}
    {mounted &&
      createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Dimmed backdrop — full viewport */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
              />

            {/* Sliding panel — h-dvh fills the full screen height.
                `fixed` + top-0 + bottom-0 makes it independent of the header's height. */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[70] flex h-dvh w-72 flex-col border-l border-border bg-background md:hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                {isAuthenticated && currentUser ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
                      {currentUser.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{currentUser.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{currentUser.username}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-foreground">Nomeo</span>
                )}

                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Search */}
                <Link
                  href="/search"
                  onClick={() => setMobileOpen(false)}
                  className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-muted-foreground"
                >
                  <SearchIcon />
                  <span className="text-sm">Search…</span>
                </Link>

                {/* Nav items — staggered entrance */}
                <ul className="flex flex-col gap-1">
                  {navItems.map((item, i) => {
                    const active = isActive(item.href);
                    return (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + i * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>

                {/* Account links when logged in */}
                {isAuthenticated && currentUser && (
                  <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                    <li>
                      <Link href={`/${currentUser.username}`} onClick={() => setMobileOpen(false)} className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">Profile</Link>
                    </li>
                    <li>
                      <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">Settings</Link>
                    </li>
                    <li>
                      <Link href="/saved" onClick={() => setMobileOpen(false)} className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">Saved posts</Link>
                    </li>
                  </ul>
                )}

                {/* Theme row */}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                  <span className="px-3 text-sm font-medium text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Pinned footer */}
              <div className="border-t border-border p-4">
                {isAuthenticated ? (
                  <button
                    onClick={() => handleSignOut()}
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <LogoutIcon />
                    Logout
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handleSignIn();
                        setMobileOpen(false);
                      }}
                      className="rounded-lg border border-border px-3 py-2.5 text-center text-sm font-medium text-foreground hover:bg-accent"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => {
                        handleSignUp();
                        setMobileOpen(false);
                      }}
                      className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
    >
      {children}
    </Link>
  );
}

/* ── Icons (inline SVG — no dependency) ────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
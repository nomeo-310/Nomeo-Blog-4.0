"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, MessageSquare, Bookmark,
  Heart, DollarSign, Users, Settings, ChevronLeft,
  ChevronRight, Menu, X, Sparkles, Bell, LogOut,
  UserCircle, Link2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { teardownRealtime } from "@/lib/ably-registry";
import { signOut } from "@/lib/authClient";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "../ui/theme-toggle";

type NavItem  = { href: string; label: string; icon: React.ElementType };
type NavGroup = { group: string; items: NavItem[] };

const CREATOR_GROUPS: NavGroup[] = [
  {
    group: "Create",
    items: [
      { href: "/dashboard/posts",       label: "Posts",       icon: FileText      },
      { href: "/dashboard/lounges",     label: "Lounges",     icon: MessageSquare },
      { href: "/dashboard/earnings",    label: "Earnings",    icon: DollarSign    },
      { href: "/dashboard/subscribers", label: "Subscribers", icon: Users         },
    ],
  },
];

const SHARED_GROUPS: NavGroup[] = [
  {
    group: "Activity",
    items: [
      { href: "/dashboard",               label: "Overview",      icon: LayoutDashboard },
      { href: "/dashboard/saved",         label: "Saved posts",   icon: Bookmark        },
      { href: "/dashboard/liked",         label: "Liked posts",   icon: Heart           },
      { href: "/dashboard/connections",   label: "Connections",   icon: Link2           },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell            },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/dashboard/profile",  label: "My profile", icon: UserCircle },
      { href: "/dashboard/settings", label: "Settings",   icon: Settings   },
    ],
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  "":             "Home",
  "dashboard":    "Dashboard",
  "posts":        "Posts",
  "lounges":      "Lounges",
  "earnings":     "Earnings",
  "subscribers":  "Subscribers",
  "saved":        "Saved posts",
  "liked":        "Liked posts",
  "connections":  "Connections",
  "notifications":"Notifications",
  "profile":      "My profile",
  "settings":     "Settings",
  "new":          "New",
};

const CONTEXT_LABELS: Record<string, Record<string, string>> = {
  "posts":   { "new": "New post"      },
  "lounges": { "new": "Create lounge" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const qc = useQueryClient();

  const isCreator = session?.user?.role === "creator";
  const navGroups: NavGroup[] = isCreator
    ? [...CREATOR_GROUPS, ...SHARED_GROUPS]
    : SHARED_GROUPS;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    await teardownRealtime();
    await signOut();
    qc.clear();
    window.location.href = "/";
  };

  const user     = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          mobileOpen
            ? "w-[240px] translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Ink rail */}
        <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/20" />

        {/* Header */}
        <div className={cn(
          "flex h-16 shrink-0 items-center justify-between border-b border-border px-4",
          collapsed && "lg:justify-center lg:px-0"
        )}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/images/logo.webp"
                alt="Nomeo"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 object-contain"
                priority
              />
              <span className="font-heading text-base font-bold text-foreground truncate">
                Nomeo
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="flex h-8 w-8 items-center justify-center">
              <Image
                src="/images/logo.webp"
                alt="Nomeo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.group} className={cn("mb-1", gi > 0 && "mt-4")}>
              {/* Group label */}
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
                  {group.group}
                </p>
              )}

              <div className="space-y-2">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        // Base — generous padding so each item has breathing room
                        "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        collapsed && "lg:justify-center lg:px-0 lg:py-3",
                        active
                          // Active — soft primary background, primary text
                          ? "bg-primary/10 text-primary"
                          // Idle — muted text, subtle hover
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {/* Ink rail dot for active item */}
                      {active && (
                        <span className="absolute -left-2 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}

                      {/* Icon — slightly larger, always coloured when active */}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />

                      {/* Label */}
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Active indicator dot (collapsed mode — visible pill under icon) */}
                      {collapsed && active && (
                        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Divider between groups */}
              {!collapsed && gi < navGroups.length - 1 && (
                <div className="mx-3 mt-4 border-t border-border/40" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer — user + sign out */}
        <div className={cn(
          "shrink-0 border-t border-border p-3",
          collapsed && "lg:flex lg:flex-col lg:items-center lg:gap-1.5"
        )}>
          {user && (
            <div className={cn(
              "flex items-center gap-2.5 rounded-xl px-2 py-2",
              collapsed && "lg:justify-center lg:px-0"
            )}>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </span>
              )}
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSignOut}
            title="Sign out"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed && "lg:w-auto lg:justify-center lg:px-0 lg:py-3"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[4.5rem] hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className={cn(
        "flex min-h-screen flex-1 flex-col transition-all duration-300",
        collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
      )}>

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Breadcrumb pathname={pathname} />
          </div>

          <div className="flex items-center gap-2">
            {isCreator && (
              <Link
                href="/dashboard/posts/new"
                className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5" />
                New post
              </Link>
            )}

            <ThemeToggle/>

            <Link
              href="/dashboard/notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <TopBarUserMenu
              user={user}
              initials={initials}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);

  type Crumb = { label: string; href: string; current: boolean };
  const crumbs: Crumb[] = [{ label: "Home", href: "/", current: false }];

  let path = "";
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    const parent       = segments[i - 1] ?? "";
    const contextLabel = CONTEXT_LABELS[parent]?.[seg];
    const staticLabel  = SEGMENT_LABELS[seg];
    const isDynamic    = !staticLabel && /^[a-f0-9]{24}$/i.test(seg);
    const label        = contextLabel ?? staticLabel ?? (isDynamic ? "Manage" : titleCase(seg));
    crumbs.push({ label, href: path, current: i === segments.length - 1 });
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 lg:flex">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />}
          {crumb.current ? (
            <span className="text-sm font-semibold text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── TopBarUserMenu ─────────────────────────────────────────────────────── */

function TopBarUserMenu({ user, initials, onSignOut }: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined;
  initials: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <div className="py-1.5">
            <DropdownItem href="/dashboard/profile" icon={<UserCircle className="h-4 w-4" />} onClick={() => setOpen(false)}>
              My profile
            </DropdownItem>
            <DropdownItem href="/dashboard/settings" icon={<Settings className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Settings
            </DropdownItem>
            <DropdownItem href="/" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Back to Nomeo
            </DropdownItem>
          </div>
          <div className="border-t border-border py-1.5">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ href, icon, children, onClick }: {
  href: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  );
}
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare03Icon,
  UserMultiple02Icon,
  Files02Icon,
  MoneyBag01Icon,
  CreditCardIcon as CreditCard02Icon,
  Message01Icon,
  UserCheck02Icon,
  ShieldUserIcon,
  ChartLineData01Icon as BarChart01Icon,
  Settings01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Menu02Icon,
  Cancel01Icon,
  Add01Icon,
  ArrowLeft02Icon,
  LogoutSquare01Icon,
  Mail01Icon,
  ViewIcon as Eye01Icon,
  UserLove01Icon,
  Globe02Icon as Globe01Icon,
  SparklesIcon,
  AdvertisimentIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminLogout } from "@/hooks/use-admin-logout";
import { authClient } from "@/lib/auth-client";
import { ThemeToggler } from "../ui/theme-toggler";
import Logo from "@/public/images/logo.webp"

type NavItem  = { href: string; label: string; icon: any; superAdminOnly?: boolean };
type NavGroup = { group: string; items: NavItem[] };

/**
 * Admin dashboard nav groups.
 * superAdminOnly items are only rendered for super_admin role.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { href: "/",           label: "Overview",    icon: DashboardSquare03Icon },
      { href: "/analytics", label: "Analytics",   icon: BarChart01Icon        },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/posts",    label: "Posts",    icon: Files02Icon        },
      { href: "/lounges",  label: "Lounges",  icon: Message01Icon      },
      { href: "/adverts",  label: "Adverts",  icon: AdvertisimentIcon  },
    ],
  },
  {
    group: "Users",
    items: [
      { href: "/users",     label: "Users",           icon: UserMultiple02Icon },
      { href: "/creators",  label: "Creators",        icon: SparklesIcon       },
      { href: "/applicants",label: "Creator apps",    icon: UserCheck02Icon    },
      { href: "/followers", label: "Followers",       icon: UserLove01Icon     },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/payments",      label: "Payments",      icon: MoneyBag01Icon  },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard02Icon },
    ],
  },
  {
    group: "Outreach",
    items: [
      { href: "/newsletter",   label: "Subscribers",  icon: Mail01Icon         },
      { href: "/campaigns",    label: "Campaigns",    icon: Globe01Icon         },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/audit-log",  label: "Audit log",   icon: Eye01Icon          },
      { href: "/admins",     label: "Admins",       icon: ShieldUserIcon,     superAdminOnly: true },
      { href: "/settings",   label: "Settings",     icon: Settings01Icon,     superAdminOnly: true },
    ],
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  dashboard:     "Overview",
  analytics:     "Analytics",
  posts:         "Posts",
  lounges:       "Lounges",
  adverts:       "Adverts",
  users:         "Users",
  creators:      "Creators",
  applicants:    "Creator applications",
  followers:     "Followers & following",
  payments:      "Payments",
  subscriptions: "Subscriptions",
  newsletter:    "Newsletter subscribers",
  campaigns:     "Campaigns",
  "audit-log":   "Audit log",
  admins:        "Admin accounts",
  settings:      "Settings",
  new:           "New",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/dashboard";
  const { data: session, isPending } = authClient.useSession();
  const qc = useQueryClient();

  const role        = (session?.user as any)?.role ?? "";
  const isSuperAdmin = role === "super_admin";

  const { logout, isLoading } = useAdminLogout();
  const router = useRouter();

  // Filter out superAdminOnly items for non-super_admins
  const navGroups: NavGroup[] = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((g) => g.items.length > 0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const logOut = useCallback(async () => {
    logout();
    qc.clear();
    router.refresh()
  }, [router]);

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
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
        mobileOpen
          ? "w-[240px] translate-x-0 shadow-2xl"
          : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Ink rail */}
        <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/20" />

        {/* Header */}
        <div className={cn(
          "flex h-16 shrink-0 items-center justify-between border-b border-border px-4",
          collapsed && "lg:justify-center lg:px-0"
        )}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <Image src={Logo} alt="Nomeo" width={32} height={32}
                className="h-8 w-8 shrink-0 object-contain" priority />
              <div className="min-w-0">
                <span className="font-heading text-sm font-bold text-foreground truncate block">
                  Nomeo
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center">
              <Image src={Logo} alt="Nomeo" width={32} height={32}
                className="h-8 w-8 object-contain" priority />
            </Link>
          )}
          {!collapsed && (
            <button onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
              aria-label="Close menu">
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.group} className={cn("mb-1", gi > 0 && "mt-4")}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
                  {group.group}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        collapsed && "lg:justify-center lg:px-0 lg:py-3",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute -left-2 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <HugeiconsIcon icon={item.icon}
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {collapsed && active && (
                        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>
              {!collapsed && gi < navGroups.length - 1 && (
                <div className="mx-3 mt-4 border-t border-border/40" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          "shrink-0 border-t border-border p-3",
          collapsed && "lg:flex lg:flex-col lg:items-center lg:gap-2"
        )}>
          {user && (
            <div className={cn(
              "flex items-center gap-2.5 rounded-xl px-2 py-2 mb-1",
              collapsed && "lg:justify-center lg:px-0"
            )}>
              {(user as any).image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(user as any).image} alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-border" />
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
            onClick={logOut}
            title="Sign out"
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "lg:w-auto lg:justify-center lg:px-0 lg:py-3"
            )}
          >
            <HugeiconsIcon icon={LogoutSquare01Icon} className="h-4 w-4 shrink-0" />
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
            ? <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5" />
            : <HugeiconsIcon icon={ArrowLeft01Icon}  className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex min-h-screen flex-1 flex-col transition-all duration-300",
        collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <HugeiconsIcon icon={Menu02Icon} className="h-5 w-5" />
            </button>
            <Breadcrumb pathname={pathname} />
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Link
                href="/dashboard/admins/new"
                className="hidden items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:inline-flex"
              >
                <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5" />
                New admin
              </Link>
            )}

            <ThemeToggler/>

            <TopBarUserMenu user={user} initials={initials} onSignOut={logOut} />
          </div>
        </header>

        {/* Page */}
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
  const crumbs: Crumb[] = [{ label: "Overview", href: "/dashboard", current: false }];

  let path = "";
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    if (seg === "dashboard") return;
    const label = SEGMENT_LABELS[seg] ?? titleCase(seg);
    crumbs.push({ label, href: path, current: i === segments.length - 1 });
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 lg:flex">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && (
            <HugeiconsIcon icon={ArrowRight01Icon}
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          )}
          {crumb.current ? (
            <span className="text-sm font-semibold text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
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
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {(user as any)?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(user as any).image} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <div className="py-1.5">
            <DropdownItem
              href="/dashboard/settings"
              icon={<HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />}
              onClick={() => setOpen(false)}
            >
              Settings
            </DropdownItem>
            <DropdownItem
              href="/dashboard/audit-log"
              icon={<HugeiconsIcon icon={Eye01Icon} className="h-4 w-4" />}
              onClick={() => setOpen(false)}
            >
              Audit log
            </DropdownItem>
            <DropdownItem
              href={process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "/"}
              icon={<HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />}
              onClick={() => setOpen(false)}
              external
            >
              Back to Nomeo
            </DropdownItem>
          </div>
          <div className="border-t border-border py-1.5">
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <HugeiconsIcon icon={LogoutSquare01Icon} className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ href, icon, children, onClick, external }: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  );
}
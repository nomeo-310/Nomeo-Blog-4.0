"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Users, X, Check, CheckCheck, UserCheck, UserX, ArrowRight, PenLine, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActivityPanel } from "@/stores/activity-panel-store";
import { useNotifications, useConnectionRequests, useActivityCount, type NotificationItem } from "@/hooks/use-activity";
import { useCoAuthorInvites } from "@/hooks/use-coauthor-invites";
import { useLoungeJoinRequests } from "@/hooks/use-lounge-join-requests";
import { authClient } from "@/lib/authClient";

export function ActivityPanel() {
  type ActivityPanelTab = "notifications" | "connections" | "coauthor" | "lounge";
  const { isOpen, tab: rawTab, close, setTab: setTabRaw } = useActivityPanel();
  const tab    = rawTab as ActivityPanelTab;
  const setTab = (value: ActivityPanelTab) => setTabRaw(value as any);

  const { notifications: notifCount, connections: connCount } = useActivityCount();
  const { invites: coAuthorInvites } = useCoAuthorInvites();
  const { requests: loungeRequests }  = useLoungeJoinRequests();
  const coAuthorCount  = coAuthorInvites.length;
  const loungeCount    = loungeRequests.length;

  // Only show lounge tab to creators
  const { data: session } = authClient.useSession();
  const isCreator = session?.user?.role === "creator";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[90] flex h-dvh w-full max-w-2xl flex-col border-l border-border bg-background sm:w-[600px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Activity</h2>
              <button onClick={close} aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border px-3 overflow-x-auto">
              <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")}
                icon={<Bell className="h-4 w-4" />} label="Notifications" count={notifCount} />
              <TabButton active={tab === "connections"} onClick={() => setTab("connections")}
                icon={<Users className="h-4 w-4" />} label="Connections" count={connCount} />
              <TabButton active={tab === "coauthor"} onClick={() => setTab("coauthor")}
                icon={<PenLine className="h-4 w-4" />} label="Co-author" count={coAuthorCount} />
              {/* Lounge tab — only visible to creators */}
              {isCreator && (
                <TabButton active={tab === "lounge"} onClick={() => setTab("lounge")}
                  icon={<DoorOpen className="h-4 w-4" />} label="Lounge" count={loungeCount} />
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "notifications" && <NotificationsTab onNavigate={close} />}
              {tab === "connections"   && <ConnectionsTab />}
              {tab === "coauthor"      && <CoAuthorInvitesTab onNavigate={close} />}
              {tab === "lounge" && isCreator && <LoungeRequestsTab />}
            </div>

            {tab === "notifications" && (
              <div className="shrink-0 border-t border-border p-3">
                <Link href="/dashboard/notifications" onClick={close}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
                  See all notifications <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number;
}) {
  return (
    <button onClick={onClick}
      className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
      {icon}
      {label}
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-opacity",
        active ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

/* ── Notifications tab ─────────────────────────────────────────────────── */

function NotificationsTab({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markRead, isMarking } = useNotifications("unread");
  const [selecting, setSelecting] = useState(false);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const markSelected = async () => {
    if (selected.size === 0) return;
    await markRead({ ids: [...selected] });
    setSelected(new Set()); setSelecting(false);
  };

  const open = async (n: NotificationItem) => {
    if (!n.isRead) markRead({ ids: [n.id] });
    const href = notifHref(n);
    if (href) { onNavigate(); router.push(href); }
  };

  if (isLoading) return <TabSkeleton />;
  if (notifications.length === 0)
    return <EmptyState icon={<Bell className="h-9 w-9" />} title="You're all caught up" subtitle="New notifications will appear here." />;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        {selecting ? (
          <>
            <button onClick={() => { setSelecting(false); setSelected(new Set()); }}
              className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
            <button onClick={markSelected} disabled={selected.size === 0 || isMarking}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-40">
              <Check className="h-4 w-4" /> Mark read
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setSelecting(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground">Select</button>
            <button onClick={() => markRead({ all: true })} disabled={unreadCount === 0 || isMarking}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-40">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </>
        )}
      </div>

      <ul className="divide-y divide-border">
        {notifications.map((n) => (
          <li key={n.id}>
            <button onClick={() => selecting ? toggle(n.id) : open(n)}
              className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40",
                !n.isRead && "bg-primary/[0.04]")}>
              {selecting && (
                <span className={cn("mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  selected.has(n.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                  {selected.has(n.id) && <Check className="h-3 w-3" />}
                </span>
              )}
              {n.actor?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.actor.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm leading-snug", n.isRead ? "text-muted-foreground" : "text-foreground")}>{n.message}</p>
                {n.createdAt && <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>}
              </div>
              {!n.isRead && !selecting && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Connections tab ───────────────────────────────────────────────────── */

function ConnectionsTab() {
  const { requests, isLoading, respond, bulk, isResponding } = useConnectionRequests();

  const act = async (id: string, action: "accept" | "decline", name: string) => {
    try {
      await respond({ id, action });
      toast.success(action === "accept" ? `You're now connected with ${name}.` : `Request from ${name} declined.`);
    } catch { toast.error("Something went wrong. Try again."); }
  };

  const actAll = async (action: "accept" | "decline") => {
    try {
      const { count } = await bulk(action);
      toast.success(action === "accept"
        ? `Accepted ${count} request${count === 1 ? "" : "s"}.`
        : `Declined ${count} request${count === 1 ? "" : "s"}.`);
    } catch { toast.error("Something went wrong. Try again."); }
  };

  if (isLoading) return <TabSkeleton />;
  if (requests.length === 0)
    return <EmptyState icon={<Users className="h-9 w-9" />} title="No pending requests" subtitle="Connection requests waiting for you will show here." />;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-medium text-foreground">{requests.length} request{requests.length === 1 ? "" : "s"}</span>
        <div className="flex gap-3">
          <button onClick={() => actAll("decline")} disabled={isResponding}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive disabled:opacity-40">
            <UserX className="h-4 w-4" /> Decline all
          </button>
          <button onClick={() => actAll("accept")} disabled={isResponding}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-40">
            <UserCheck className="h-4 w-4" /> Accept all
          </button>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {requests.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-4">
            {r.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.user.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {r.user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{r.user.name}</p>
              {r.user.username && <p className="text-xs text-muted-foreground">@{r.user.username}</p>}
              {r.message && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">"{r.message}"</p>}
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => act(r.id, "accept", r.user.name)} disabled={isResponding}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button onClick={() => act(r.id, "decline", r.user.name)} disabled={isResponding}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50">
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Co-author invites tab ─────────────────────────────────────────────── */

function CoAuthorInvitesTab({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { invites, isLoading, respond, isResponding } = useCoAuthorInvites();

  const act = async (postId: string, action: "accept" | "decline", postTitle: string) => {
    try {
      await respond({ postId, action });
      toast.success(action === "accept"
        ? `You're now a co-author on "${postTitle}".`
        : `Invite for "${postTitle}" declined.`);
    } catch { toast.error("Something went wrong. Try again."); }
  };

  if (isLoading) return <TabSkeleton />;
  if (invites.length === 0)
    return <EmptyState icon={<PenLine className="h-9 w-9" />} title="No pending invites" subtitle="Co-author invites from other creators will show here." />;

  return (
    <ul className="divide-y divide-border">
      {invites.map((inv) => (
        <li key={inv.postId} className="flex items-start gap-3 px-4 py-4">
          {inv.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inv.author.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {inv.author.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{inv.author.name}</span> invited you to co-author
            </p>
            <button
              onClick={() => { onNavigate(); router.push(`/dashboard/posts`); }}
              className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-left transition-colors hover:bg-accent">
              {inv.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inv.coverImage} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <PenLine className="h-4 w-4 text-primary" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">{inv.postTitle}</span>
                <span className="block text-[11px] capitalize text-muted-foreground">
                  As {inv.role} · {inv.postStatus === "published" ? "Published" : "Draft"}
                </span>
              </span>
            </button>
            <div className="mt-2.5 flex gap-2">
              <button onClick={() => act(inv.postId, "accept", inv.postTitle)} disabled={isResponding}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                <Check className="h-3.5 w-3.5" /> Accept
              </button>
              <button onClick={() => act(inv.postId, "decline", inv.postTitle)} disabled={isResponding}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50">
                Decline
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Lounge join requests tab (creator only) ───────────────────────────── */

function LoungeRequestsTab() {
  const { requests, isLoading, respond, isResponding } = useLoungeJoinRequests();

  const act = async (
    loungeId: string, requestId: string,
    action: "approve" | "decline", name: string, loungeName: string
  ) => {
    try {
      await respond({ loungeId, requestId, action });
      toast.success(action === "approve"
        ? `${name} approved to join ${loungeName}.`
        : `${name}'s request to join ${loungeName} declined.`);
    } catch { toast.error("Something went wrong. Try again."); }
  };

  if (isLoading) return <TabSkeleton />;
  if (requests.length === 0)
    return (
      <EmptyState
        icon={<DoorOpen className="h-9 w-9" />}
        title="No pending requests"
        subtitle="Join requests for your creator lounges will appear here."
      />
    );

  return (
    <div>
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-sm font-medium text-foreground">
          {requests.length} pending request{requests.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {requests.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-4">
            {r.requester.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.requester.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {r.requester.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{r.requester.name}</p>
              {r.requester.username && (
                <p className="text-xs text-muted-foreground">@{r.requester.username}</p>
              )}
              {/* Which lounge they're requesting */}
              <p className="mt-1 text-xs text-muted-foreground">
                Wants to join <span className="font-medium text-foreground">{r.loungeName}</span>
              </p>
              {/* Optional message */}
              {r.message && (
                <p className="mt-1.5 line-clamp-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
                  "{r.message}"
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => act(r.loungeId, r.id, "approve", r.requester.name, r.loungeName)}
                  disabled={isResponding}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => act(r.loungeId, r.id, "decline", r.requester.name, r.loungeName)}
                  disabled={isResponding}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50">
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Shared ─────────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center text-muted-foreground">
      <span className="opacity-30">{icon}</span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm">{subtitle}</p>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function notifHref(n: NotificationItem): string | null {
  switch (n.entityType) {
    case "post":          return n.entityId ? `/post/${n.entityId}` : null;
    case "lounge_message":return n.entityId ? `/lounges/${n.entityId}` : null;
    case "user":          return n.actor?.username ? `/${n.actor.username}` : null;
    default:              return null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}
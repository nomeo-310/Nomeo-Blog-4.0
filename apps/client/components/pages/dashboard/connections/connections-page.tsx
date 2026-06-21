"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle, Search, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { useOpenDM } from "@/hooks/use-open-dm";
import { cn } from "@/lib/utils";

/**
 * Connections page — Following / Followers tabs.
 *
 * Following = people I follow (I initiated).
 * Followers = people who follow me (they initiated, I accepted).
 *
 * Both fetch from GET /api/connections?tab=following|followers.
 * Client component for search + message actions.
 *
 * Route: app/dashboard/connections/page.tsx
 */

type Connection = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  isCreator: boolean;
};

type Tab = "following" | "followers";

export default function ConnectionsPage() {
  const [tab, setTab] = useState<Tab>("following");
  const [query, setQuery] = useState("");
  const { openDM, opening } = useOpenDM();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-connections", tab],
    queryFn: async () => {
      const { data } = await api.get<{ connections: Connection[]; total: number }>(
        `/api/connections?tab=${tab}`
      );
      return data;
    },
    staleTime: 60_000,
  });

  const all = data?.connections ?? [];
  const total = data?.total ?? 0;

  const filtered = all.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Connections</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          People you follow and people who follow you.
        </p>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
          <TabBtn
            active={tab === "following"}
            onClick={() => { setTab("following"); setQuery(""); }}
            icon={<UserPlus className="h-3.5 w-3.5" />}
            label="Following"
          />
          <TabBtn
            active={tab === "followers"}
            onClick={() => { setTab("followers"); setQuery(""); }}
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Followers"
          />
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {total} {tab === "following" ? "people you follow" : total === 1 ? "follower" : "followers"}
          {query && filtered.length !== total && ` · ${filtered.length} match`}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} query={query} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {filtered.map((c) => (
            <ConnectionCard
              key={c.id}
              person={c}
              tab={tab}
              onMessage={() => openDM(c.id)}
              messaging={opening === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */

function ConnectionCard({ person, tab, onMessage, messaging }: {
  person: Connection;
  tab: Tab;
  onMessage: () => void;
  messaging: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <Link href={`/profile/${person.username}`} className="shrink-0">
        {person.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/profile/${person.username}`} className="truncate text-sm font-semibold text-foreground hover:text-primary">
            {person.name}
          </Link>
          {person.isCreator && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Creator
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
        {person.bio && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{person.bio}</p>
        )}
      </div>
      {/* Only show message button for people you follow (you're connected both ways if they accepted) */}
      {tab === "following" && (
        <button
          onClick={onMessage}
          disabled={messaging}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          title="Message"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

function EmptyState({ tab, query }: { tab: Tab; query: string }) {
  if (query) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground/30" />
        <h3 className="mt-4 font-heading text-base font-bold text-foreground">No matches</h3>
        <p className="mt-2 text-sm text-muted-foreground">Try a different name or username.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <Users className="h-8 w-8 text-muted-foreground/30" />
      <h3 className="mt-4 font-heading text-base font-bold text-foreground">
        {tab === "following" ? "Not following anyone yet" : "No followers yet"}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {tab === "following"
          ? "Discover writers and readers on Nomeo and send a follow request."
          : "When people follow you, they'll appear here."}
      </p>
      {tab === "following" && (
        <Link href="/" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Discover people
        </Link>
      )}
    </div>
  );
}

/* ── Tab button ─────────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, UserCheck02Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/axios";
import { useOpenDM } from "@/hooks/use-open-dm";
import { cn } from "@/lib/utils";
import { ConnectionCard } from "./connections-card";
import { EmptyState } from "./connections-empty-state";
import type { Connection, Tab } from "./connections-types";

/**
 * Connections page — Following / Followers tabs.
 *
 * Following = people I follow (I initiated).
 * Followers = people who follow me (they initiated, I accepted).
 *
 * Both fetch from GET /api/connections?tab=following|followers.
 * Client component for search + message actions.
 *
 * Layout is composed from sibling sub-components in this same folder
 * (connections-card, connections-empty-state); this file owns the data
 * layer and top-level composition only.
 *
 * Route: app/dashboard/connections/page.tsx
 */

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
            icon={<HugeiconsIcon icon={UserAdd02Icon} className="h-3.5 w-3.5" />}
            label="Following"
          />
          <TabBtn
            active={tab === "followers"}
            onClick={() => { setTab("followers"); setQuery(""); }}
            icon={<HugeiconsIcon icon={UserCheck02Icon} className="h-3.5 w-3.5" />}
            label="Followers"
          />
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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

/* ── Tab button ─────────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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

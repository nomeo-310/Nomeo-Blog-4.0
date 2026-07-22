"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { useMyAdverts, type MyAdvert } from "@/hooks/use-my-adverts";
import { PromotionCard } from "./promotion-card";
import { PromotionFormModal } from "./promotion-form-modal";
import type { EligiblePost } from "./promotion-types";

/**
 * PromotionsPage — a creator's "boost my post" dashboard.
 *
 * `initialPosts` (their published posts, eligible to be promoted) is
 * fetched server-side by the route wrapper and passed in as a prop; the
 * promotions themselves are inherently mutable state, so they're fetched
 * and mutated entirely client-side via useMyAdverts (see hooks/use-my-adverts.ts).
 */
export function PromotionsPage({ initialPosts }: { initialPosts: EligiblePost[] }) {
  const { adverts, isLoading } = useMyAdverts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<MyAdvert | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (advert: MyAdvert) => { setEditing(advert); setFormOpen(true); };
  const closeForm  = () => setFormOpen(false);

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Promotions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boost your posts in the feed. Every promotion is reviewed before it goes live.
          </p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Promote a post
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 py-5">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
                <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-muted sm:h-28 sm:w-28" />
            </div>
          ))}
        </div>
      ) : adverts.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground/30" />
          <h3 className="mt-4 font-heading text-base font-bold text-foreground">No promotions yet</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Promote a published post to reach more readers in the home feed.
          </p>
          {initialPosts.length > 0 && (
            <button onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Promote a post
            </button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-5xl">
          {adverts.map((advert, i) => (
            <div key={advert.id}>
              <PromotionCard advert={advert} onEdit={openEdit} />
              {/* Divider between rows — not after the last one */}
              {i < adverts.length - 1 && <div className="border-t border-border" />}
            </div>
          ))}
        </div>
      )}

      <PromotionFormModal isOpen={formOpen} onClose={closeForm} posts={initialPosts} editing={editing} />
    </div>
  );
}

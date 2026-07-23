"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, BookOpen, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";
import { SeriesCard } from "./series-card";
import type { DashboardPost, DashboardSeries } from "./posts-grid-types";

export type { DashboardPost, DashboardSeries } from "./posts-grid-types";

/**
 * PostsGrid — client island for the dashboard posts page.
 * Handles: tab switching, search, dropdown actions, grid layout.
 *
 * Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
 *
 * Post/series tiles live in ./post-card.tsx and ./series-card.tsx;
 * shared types in ./posts-grid-types.ts and formatting helpers in
 * ./posts-grid-format.ts.
 */

type Tab = "posts" | "series";
type PostFilter = "all" | "published" | "draft" | "removed";

interface Props {
  initialPosts:  DashboardPost[];
  initialSeries: DashboardSeries[];
}

export function PostsGrid({ initialPosts, initialSeries }: Props) {
  const [tab,    setTab]    = useState<Tab>("posts");
  const [posts,  setPosts]  = useState(initialPosts);
  const [series] = useState(initialSeries);
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<PostFilter>("all");

  const filteredPosts = posts.filter(p => {
    const matchesQuery  = !query || p.title.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" ? true
      : filter === "removed" ? p.isRemoved
      : !p.isRemoved && p.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filteredSeries = series.filter(s =>
    !query || s.title.toLowerCase().includes(query.toLowerCase())
  );

  const published = posts.filter(p => !p.isRemoved && p.status === "published").length;
  const drafts    = posts.filter(p => !p.isRemoved && p.status === "draft").length;
  const removed   = posts.filter(p => p.isRemoved).length;

  /* ── Actions ── */

  // Permanent — only ever reachable once a post is already removed (the UI
  // only shows this action in that state, and the API enforces it too).
  const handleDelete = async (post: DashboardPost) => {
    if (!confirm(`Permanently delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/posts/${post.slug}`);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      toast.success("Post permanently deleted.");
    } catch {
      toast.error("Couldn't delete. Try again.");
    }
  };

  // Reversible — hides the post from every public surface but keeps it
  // right here in the dashboard (editable, restorable, or deletable).
  const handleRemove = async (post: DashboardPost) => {
    if (!confirm(`Remove "${post.title}"? It'll be hidden from readers until you restore it.`)) return;
    try {
      await api.post(`/api/posts/${post.slug}/remove`);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isRemoved: true } : p));
      toast.success("Post removed. Restore it anytime from here.");
    } catch {
      toast.error("Couldn't remove. Try again.");
    }
  };

  const handleRestore = async (post: DashboardPost) => {
    try {
      await api.post(`/api/posts/${post.slug}/restore`);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isRemoved: false } : p));
      toast.success("Post restored.");
    } catch {
      toast.error("Couldn't restore. Try again.");
    }
  };

  const handleTogglePublish = async (post: DashboardPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const label     = newStatus === "published" ? "Published" : "Unpublished";
    try {
      await api.patch(`/api/posts/${post.slug}`, { status: newStatus });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
      toast.success(`${label}.`);
    } catch {
      toast.error("Couldn't update post status.");
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab("posts")}
          className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "posts" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <PenLine className="h-4 w-4" />
          Posts
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            tab === "posts" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {posts.length}
          </span>
        </button>
        <button
          onClick={() => setTab("series")}
          className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "series" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <BookOpen className="h-4 w-4" />
          Series
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            tab === "series" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {series.length}
          </span>
        </button>
      </div>

      {/* ── Search + filter bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 min-w-48">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === "posts" ? "Search posts…" : "Search series…"}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>

        {/* Filter pills — posts only */}
        {tab === "posts" && (
          <div className="flex items-center gap-1">
            {([["all","All"], ["published","Published"], ["draft","Drafts"], ["removed","Removed"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === val ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground")}>
                {label}
                {val === "published" && ` (${published})`}
                {val === "draft"     && ` (${drafts})`}
                {val === "removed"   && ` (${removed})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Posts grid ────────────────────────────────────────────────── */}
      {tab === "posts" && (
        filteredPosts.length === 0 ? (
          <EmptyState
            icon={<PenLine className="h-8 w-8 text-muted-foreground/30" />}
            title={query || filter !== "all" ? "No posts match this filter" : "No posts yet"}
            desc={query || filter !== "all" ? "Try a different search or filter." : "Write your first post and share it with the Nomeo community."}
            action={!query && filter === "all" ? <Link href="/dashboard/posts/new" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" />New post</Link> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handleDelete}
                onRemove={handleRemove}
                onRestore={handleRestore}
                onTogglePublish={handleTogglePublish}
              />
            ))}
          </div>
        )
      )}

      {/* ── Series grid ───────────────────────────────────────────────── */}
      {tab === "series" && (
        filteredSeries.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8 text-muted-foreground/30" />}
            title={query ? "No series match this search" : "No series yet"}
            desc={query ? "Try a different search term." : "Group your posts into a series to help readers follow along."}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSeries.map(s => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, desc, action }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">{icon}</span>
      <h3 className="mt-4 font-heading text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{desc}</p>
      {action}
    </div>
  );
}

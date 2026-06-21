"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  PenLine, Eye, Heart, MessageCircle, Lock, Globe,
  BookOpen, MoreVertical, Edit2, Trash2, EyeOff, Eye as EyeIcon,
  Plus, Search, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

export type DashboardPost = {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  status: string;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt: string | null;
  seriesTitle: string | null;
};

export type DashboardSeries = {
  id: string;
  title: string;
  description: string;
  postsCount: number;
  isPublished: boolean;
  coverImage: string;
  createdAt: string;
};


/**
 * PostsGrid — client island for the dashboard posts page.
 * Handles: tab switching, search, dropdown actions, grid layout.
 *
 * Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
 */

type Tab = "posts" | "series";

interface Props {
  initialPosts:  DashboardPost[];
  initialSeries: DashboardSeries[];
}

export function PostsGrid({ initialPosts, initialSeries }: Props) {
  const [tab,    setTab]    = useState<Tab>("posts");
  const [posts,  setPosts]  = useState(initialPosts);
  const [series, setSeries] = useState(initialSeries);
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const filteredPosts = posts.filter(p => {
    const matchesQuery  = !query || p.title.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || p.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filteredSeries = series.filter(s =>
    !query || s.title.toLowerCase().includes(query.toLowerCase())
  );

  const published = posts.filter(p => p.status === "published").length;
  const drafts    = posts.filter(p => p.status === "draft").length;

  /* ── Actions ── */

  const handleDelete = async (post: DashboardPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/posts/${post.slug}`);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      toast.success("Post deleted.");
    } catch {
      toast.error("Couldn't delete. Try again.");
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
            {([["all","All"], ["published","Published"], ["draft","Drafts"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === val ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground")}>
                {label}
                {val === "published" && ` (${published})`}
                {val === "draft"     && ` (${drafts})`}
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
              <PostCard key={post.id} post={post} onDelete={handleDelete} onTogglePublish={handleTogglePublish} />
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

/* ── Post card ──────────────────────────────────────────────────────────── */

function PostCard({
  post, onDelete, onTogglePublish,
}: {
  post: DashboardPost;
  onDelete: (p: DashboardPost) => void;
  onTogglePublish: (p: DashboardPost) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
      {/* Cover image */}
      <Link href={`/post/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden rounded-t-2xl bg-muted">
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <PenLine className="h-8 w-8 text-primary/20" />
          </div>
        )}

        {/* Status badge */}
        <span className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold",
          post.status === "published"
            ? "bg-green-500/90 text-white"
            : "bg-muted/90 text-muted-foreground backdrop-blur"
        )}>
          {post.status === "published" ? "Published" : "Draft"}
        </span>

        {/* Access badge */}
        <span className={cn(
          "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur",
          post.access === "paid"
            ? "bg-primary/90 text-primary-foreground"
            : "bg-background/80 text-muted-foreground"
        )}>
          {post.access === "paid"
            ? <><Lock className="h-2.5 w-2.5" /> Members</>
            : <><Globe className="h-2.5 w-2.5" /> Free</>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {/* Series label */}
        {post.seriesTitle && (
          <p className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <BookOpen className="h-3 w-3" />{post.seriesTitle}
          </p>
        )}

        {/* Title */}
        <Link href={`/post/${post.slug}`} className="block">
          <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h3>
        </Link>

        {/* Stats + date */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(post.viewsCount)}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{formatCount(post.likesCount)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{formatCount(post.commentsCount)}</span>
          {post.publishedAt && <span className="ml-auto">{formatDate(post.publishedAt)}</span>}
        </div>

        {/* Footer: Edit link + dropdown */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 mt-3">
          <Link
            href={`/dashboard/posts/${post.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Link>

          {/* Dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-[100] mt-1 min-w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <Link
                  href={`/dashboard/posts/${post.id}/edit`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" /> Edit post
                </Link>

                <button
                  onClick={() => { setMenuOpen(false); onTogglePublish(post); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  {post.status === "published"
                    ? <><EyeOff className="h-4 w-4 text-muted-foreground" /> Unpublish</>
                    : <><EyeIcon className="h-4 w-4 text-muted-foreground" /> Publish</>}
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  onClick={() => { setMenuOpen(false); onDelete(post); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── Series card ────────────────────────────────────────────────────────── */

function SeriesCard({ series }: { series: DashboardSeries }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/10 to-primary/5">
        {series.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.coverImage} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/20" />
          </div>
        )}
        <span className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold",
          series.isPublished ? "bg-green-500/90 text-white" : "bg-muted/90 text-muted-foreground backdrop-blur"
        )}>
          {series.isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {series.title}
        </h3>
        {series.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {series.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {series.postsCount} {series.postsCount === 1 ? "post" : "posts"}
          <span className="ml-auto">{formatDate(series.createdAt)}</span>
        </div>

        <div className="mt-auto border-t border-border pt-3 mt-3">
          <Link
            href={`/dashboard/posts?series=${series.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Eye className="h-3.5 w-3.5" /> View posts
          </Link>
        </div>
      </div>
    </article>
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

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
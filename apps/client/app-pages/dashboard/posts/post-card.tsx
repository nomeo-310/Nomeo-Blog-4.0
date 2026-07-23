"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  PenLine, Eye, Heart, MessageCircle, Lock, Globe,
  BookOpen, MoreVertical, Edit2, Trash2, EyeOff, Eye as EyeIcon,
  ArchiveRestore, ArchiveX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardPost } from "./posts-grid-types";
import { formatDate, formatCount } from "./posts-grid-format";

/**
 * PostCard — single post tile in the dashboard posts grid: cover image,
 * status/access badges, title, stats, and an edit link + actions dropdown.
 *
 * A removed post (isRemoved) is dimmed and swaps the dropdown's live-post
 * actions (Publish/Unpublish, Remove) for trash actions (Restore, Delete
 * permanently) — editing stays available either way.
 */
export function PostCard({
  post, onDelete, onRemove, onRestore, onTogglePublish,
}: {
  post: DashboardPost;
  onDelete: (p: DashboardPost) => void;
  onRemove: (p: DashboardPost) => void;
  onRestore: (p: DashboardPost) => void;
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
    <article className={cn(
      "group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md",
      post.isRemoved && "opacity-60 hover:opacity-100"
    )}>
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
          post.isRemoved
            ? "bg-destructive/90 text-white"
            : post.status === "published"
            ? "bg-green-500/90 text-white"
            : "bg-muted/90 text-muted-foreground backdrop-blur"
        )}>
          {post.isRemoved ? "Removed" : post.status === "published" ? "Published" : "Draft"}
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

                {post.isRemoved ? (
                  <button
                    onClick={() => { setMenuOpen(false); onRestore(post); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                  >
                    <ArchiveRestore className="h-4 w-4 text-muted-foreground" /> Restore post
                  </button>
                ) : (
                  <button
                    onClick={() => { setMenuOpen(false); onTogglePublish(post); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                  >
                    {post.status === "published"
                      ? <><EyeOff className="h-4 w-4 text-muted-foreground" /> Unpublish</>
                      : <><EyeIcon className="h-4 w-4 text-muted-foreground" /> Publish</>}
                  </button>
                )}

                <div className="my-1 border-t border-border" />

                {post.isRemoved ? (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(post); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" /> Delete permanently
                  </button>
                ) : (
                  <button
                    onClick={() => { setMenuOpen(false); onRemove(post); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <ArchiveX className="h-4 w-4" /> Remove post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

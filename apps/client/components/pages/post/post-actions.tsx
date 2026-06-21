"use client";

import { useState } from "react";
import { Heart, Bookmark, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

/**
 * PostActions — like, save, share buttons for a post.
 * Client island — handles optimistic toggle state.
 * Placed below the post content, above the comment section.
 *
 * Props come from the server — initial state fetched server-side
 * so the first render shows the correct liked/saved state.
 */

interface PostActionsProps {
  postSlug:      string;
  initialLiked:  boolean;
  initialSaved:  boolean;
  likesCount:    number;
  commentsCount: number;
  savesCount:    number;
  isSignedIn:    boolean;
}

export function PostActions({
  postSlug,
  initialLiked,
  initialSaved,
  likesCount:    initLikes,
  commentsCount,
  savesCount:    initSaves,
  isSignedIn,
}: PostActionsProps) {
  const [liked,  setLiked]  = useState(initialLiked);
  const [saved,  setSaved]  = useState(initialSaved);
  const [likes,  setLikes]  = useState(initLikes);
  const [saves,  setSaves]  = useState(initSaves);
  const [copied, setCopied] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleLike = async () => {
    if (!isSignedIn) { toast.error("Sign in to like posts."); return; }
    if (liking) return;
    // Optimistic
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => wasLiked ? n - 1 : n + 1);
    try {
      const { data } = await api.post(`/api/posts/${postSlug}/like`);
      // Sync with server truth in case of race
      setLiked(data.liked);
      setLikes(data.likesCount ?? (wasLiked ? likes - 1 : likes + 1));
    } catch {
      // Roll back
      setLiked(wasLiked);
      setLikes((n) => wasLiked ? n + 1 : n - 1);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setLiking(false);
    }
  };

  const toggleSave = async () => {
    if (!isSignedIn) { toast.error("Sign in to save posts."); return; }
    if (saving) return;
    setSaving(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaves((n) => wasSaved ? n - 1 : n + 1);
    try {
      const { data } = await api.post(`/api/posts/${postSlug}/save`);
      setSaved(data.saved);
      setSaves(data.savesCount ?? (wasSaved ? saves - 1 : saves + 1));
    } catch {
      setSaved(wasSaved);
      setSaves((n) => wasSaved ? n + 1 : n - 1);
      toast.error("Couldn't update save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard.");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share — no toast needed
    }
  };

  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
      {/* Left: engagement */}
      <div className="flex items-center gap-1">
        {/* Like */}
        <button
          onClick={toggleLike}
          disabled={liking}
          title={liked ? "Unlike" : "Like this post"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
            liked
              ? "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span>{formatCount(likes)}</span>
        </button>

        {/* Save */}
        <button
          onClick={toggleSave}
          disabled={saving}
          title={saved ? "Unsave" : "Save post"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
            saved
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          <span>{formatCount(saves)}</span>
        </button>
      </div>

      {/* Right: share */}
      <button
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
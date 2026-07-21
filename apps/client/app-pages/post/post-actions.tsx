"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, Bookmark01Icon, Share08Icon, Message01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/stores/modal-store";
import { saveRedirectIntent } from "@/lib/redirect-storage";
import { FloatButton } from "./float-button";
import { ShareModal } from "./share-modal";
import { formatCount } from "./post-format";

interface PostActionsProps {
  postSlug:      string;
  postTitle:     string;   // needed for share text
  coverImage?:   string;   // og:image url passed from server
  initialLiked:  boolean;
  initialSaved:  boolean;
  likesCount:    number;
  commentsCount: number;
  savesCount:    number;
  isSignedIn:    boolean;
}

/** Like/save/comment/share bar — an inline row plus a floating sidebar pill on wide screens. */
export function PostActions({ postSlug, postTitle, coverImage, initialLiked, initialSaved, likesCount: initLikes, commentsCount, savesCount: initSaves, isSignedIn }: PostActionsProps) {

  const [liked,       setLiked]       = useState(initialLiked);
  const [saved,       setSaved]       = useState(initialSaved);
  const [likes,       setLikes]       = useState(initLikes);
  const [saves,       setSaves]       = useState(initSaves);
  const [liking,      setLiking]      = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [floatVisible,setFloatVisible]= useState(false);
  const [mounted,     setMounted]     = useState(false);

  const { setMode, open } = useAuthModal();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setFloatVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLike = async () => {
    if (!isSignedIn) {
      saveRedirectIntent();
      setMode('sign-in');
      open();
      return;
    }
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => wasLiked ? n - 1 : n + 1);
    try {
      const { data } = await api.post(`/api/posts/${postSlug}/like`);
      setLiked(data.liked);
      setLikes(data.likesCount ?? (wasLiked ? likes - 1 : likes + 1));
    } catch {
      setLiked(wasLiked);
      setLikes((n) => wasLiked ? n + 1 : n - 1);
      toast.error("Couldn't update like. Try again.");
    } finally { setLiking(false); }
  };

  const toggleSave = async () => {
    if (!isSignedIn) {
      saveRedirectIntent();
      setMode('sign-in');
      open();
      return;
    }
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
    } finally { setSaving(false); }
  };

  const scrollToComments = () => {
    document.querySelector("#comments")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Floating sidebar pill ──────────────────────────────────────── */}
      <div className={cn(
        "fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/90 p-2 shadow-lg backdrop-blur-sm transition-all duration-300 xl:flex",
        floatVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
      )}>
        <FloatButton onClick={toggleLike} active={liked} disabled={liking}
          title={liked ? "Unlike" : "Like"} activeClass="text-rose-500 bg-rose-50 dark:bg-rose-950/40">
          <HugeiconsIcon icon={FavouriteIcon} className={cn("h-5 w-5", liked && "fill-current")} />
          <span className="text-xs font-medium">{formatCount(likes)}</span>
        </FloatButton>

        <FloatButton onClick={toggleSave} active={saved} disabled={saving}
          title={saved ? "Unsave" : "Save"} activeClass="text-primary bg-primary/10">
          <HugeiconsIcon icon={Bookmark01Icon} className={cn("h-5 w-5", saved && "fill-current")} />
          <span className="text-xs font-medium">{formatCount(saves)}</span>
        </FloatButton>

        <FloatButton onClick={scrollToComments} active={false} title="Comments" activeClass="">
          <HugeiconsIcon icon={Message01Icon} className="h-5 w-5" />
          <span className="text-xs font-medium">{formatCount(commentsCount)}</span>
        </FloatButton>

        <div className="my-1 h-px w-8 bg-border" />

        <FloatButton onClick={() => setShareOpen(true)} active={false}
          title="Share" activeClass="text-primary bg-primary/10">
          <HugeiconsIcon icon={Share08Icon} className="h-5 w-5" />
        </FloatButton>
      </div>

      {/* ── Inline bar ────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <div className="flex items-center gap-1">
          <button onClick={toggleLike} disabled={liking} title={liked ? "Unlike" : "Like this post"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
              liked ? "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}>
            <HugeiconsIcon icon={FavouriteIcon} className={cn("h-4 w-4", liked && "fill-current")} />
            <span>{formatCount(likes)}</span>
          </button>

          <button onClick={toggleSave} disabled={saving} title={saved ? "Unsave" : "Save post"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
              saved ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}>
            <HugeiconsIcon icon={Bookmark01Icon} className={cn("h-4 w-4", saved && "fill-current")} />
            <span>{formatCount(saves)}</span>
          </button>
        </div>

        <button onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <HugeiconsIcon icon={Share08Icon} className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* ── Share modal — portalled to body ───────────────────────────── */}
      {mounted && shareOpen && createPortal(
        <ShareModal
          title={postTitle}
          coverImage={coverImage}
          onClose={() => setShareOpen(false)}
          copied={copied}
          setCopied={setCopied}
        />,
        document.body
      )}
    </>
  );
}

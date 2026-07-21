"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Message01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuthModal } from "@/stores/modal-store";
import { saveRedirectIntent } from "@/lib/redirect-storage";
import { AvatarBubble } from "./avatar-bubble";
import { CommentItem } from "./comment-item";
import type { Comment } from "./comment-types";

/**
 * CommentSection — threaded comments on a post.
 *
 * Features:
 *   • Lists top-level comments with their replies inline
 *   • Add top-level comment (signed-in only)
 *   • Reply to a comment (signed-in only)
 *   • Like a comment (signed-in only) — optimistic toggle
 *   • Delete own comment (soft-delete, shows placeholder)
 *   • Load more pagination (20 per page)
 *   • Guest users see the list but get a prompt to sign in to participate
 *
 * Owns all comment state/mutations; rendering of a single comment (with its
 * replies) is delegated to CommentItem, and avatars to AvatarBubble — both
 * sibling files in this folder.
 */

interface CommentSectionProps {
  postSlug:   string;
  isSignedIn: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}

export function CommentSection({ postSlug, isSignedIn, currentUserId, currentUserName, currentUserAvatar }: CommentSectionProps) {
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body,        setBody]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [replyingTo,  setReplyingTo]  = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { open, setMode } = useAuthModal();

  // ── Fetch comments ─────────────────────────────────────────────────
  const fetchComments = async (p = 1, append = false) => {
    try {
      const { data } = await api.get(`/api/posts/${postSlug}/comments?page=${p}`);
      setComments((prev) => append ? [...prev, ...data.comments] : data.comments);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch { /* silently fail */ }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchComments(1); }, [postSlug]);

  // ── Submit a top-level comment or reply ──────────────────────────────
  const submit = async (parentId: string | null = null) => {
    const text = body.trim();
    if (!text) return;
    if (!isSignedIn) { toast.error("Sign in to comment."); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/posts/${postSlug}/comments`, {
        body: text,
        parentId,
      });

      const newComment: Comment = {
        id:               data.id,
        body:             text,
        authorName:       currentUserName ?? "You",
        authorUsername:   "",
        authorAvatar:     currentUserAvatar ?? "",
        likesCount:       0,
        isLiked:          false,
        isOwnComment:     true,
        isDeletedByAuthor:false,
        createdAt:        new Date().toISOString(),
        replies:          [],
      };

      if (parentId) {
        // Insert reply into the parent comment
        setComments((prev) => prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, { ...newComment }] }
            : c
        ));
        setReplyingTo(null);
      } else {
        setComments((prev) => [newComment, ...prev]);
        setTotal((n) => n + 1);
      }

      setBody("");
    } catch {
      toast.error("Couldn't post comment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Like a comment ─────────────────────────────────────────────────
  const likeComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!isSignedIn) { toast.error("Sign in to like comments."); return; }

    const updateComment = (c: Comment): Comment => {
      if (!isReply && c.id === commentId) {
        return { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 };
      }
      if (isReply && c.id === parentId) {
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId
              ? { ...r, isLiked: !r.isLiked, likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1 }
              : r
          ),
        };
      }
      return c;
    };

    setComments((prev) => prev.map(updateComment)); // optimistic
    try {
      await api.post(`/api/comments/${commentId}/like`);
    } catch {
      setComments((prev) => prev.map(updateComment)); // roll back
    }
  };

  // ── Delete own comment ─────────────────────────────────────────────
  const deleteComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.delete(`/api/comments/${commentId}`);
      if (isReply && parentId) {
        setComments((prev) => prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, isDeletedByAuthor: true, body: "" } : r) }
            : c
        ));
      } else {
        setComments((prev) => prev.map((c) =>
          c.id === commentId ? { ...c, isDeletedByAuthor: true, body: "" } : c
        ));
      }
    } catch { toast.error("Couldn't delete comment."); }
  };

  const hasMore = comments.length < total;

  return (
    <section className="mt-16 lg:border-t-0 border-t border-border pt-10">
      <h2 className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
        <HugeiconsIcon icon={Message01Icon} className="h-5 w-5 text-primary" />
        Comments
        {total > 0 && <span className="text-base font-normal text-muted-foreground">({total})</span>}
      </h2>

      {/* ── Add comment ───────────────────────────────────────────────── */}
      {isSignedIn ? (
        <div className="mb-8 flex gap-3">
          <AvatarBubble name={currentUserName ?? "?"} avatar={currentUserAvatar} size="sm" />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(null); }}
              placeholder="Share your thoughts…"
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{body.length}/2000 · ⌘↵ to post</p>
              <button
                onClick={() => submit(null)}
                disabled={!body.trim() || submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HugeiconsIcon icon={SentIcon} className="h-3.5 w-3.5" />}
                Post
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-4">
          <HugeiconsIcon icon={Message01Icon} className="h-5 w-5 text-muted-foreground/50" />
          <button onClick={() => {saveRedirectIntent(); setMode('sign-in'); open();}} className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary hover:underline">Sign in</span>
            {" "}to join the conversation.
          </button>
        </div>
      )}

      {/* ── Comment list ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded-full bg-muted" />
                <div className="h-4 w-full rounded-lg bg-muted" />
                <div className="h-4 w-3/4 rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-10 text-center">
          <HugeiconsIcon icon={Message01Icon} className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isSignedIn={isSignedIn}
              replyingTo={replyingTo}
              replyBody={replyingTo === comment.id ? body : ""}
              submitting={submitting}
              onSetReplyingTo={(id) => {
                setReplyingTo(id);
                if (id) { setBody(""); setTimeout(() => textareaRef.current?.focus(), 100); }
              }}
              onReplyBodyChange={setBody}
              onSubmitReply={() => submit(comment.id)}
              onLike={(id, isReply) => likeComment(id, isReply, comment.id)}
              onDelete={(id, isReply) => deleteComment(id, isReply, comment.id)}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => { setLoadingMore(true); fetchComments(page + 1, true); }}
          disabled={loadingMore}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4" />}
          Load more comments
        </button>
      )}
    </section>
  );
}

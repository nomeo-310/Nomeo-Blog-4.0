"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, SentIcon, ArrowDown01Icon, ArrowUp01Icon, Delete03Icon } from "@hugeicons/core-free-icons";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AvatarBubble } from "./avatar-bubble";
import type { Comment } from "./comment-types";

/** One top-level comment, its actions (like/reply/delete), and its replies. */
export function CommentItem({
  comment, isSignedIn, replyingTo, replyBody, submitting, onSetReplyingTo, onReplyBodyChange, onSubmitReply, onLike, onDelete,
}: {
  comment: Comment;
  isSignedIn: boolean;
  replyingTo: string | null;
  replyBody: string;
  submitting: boolean;
  onSetReplyingTo: (id: string | null) => void;
  onReplyBodyChange: (v: string) => void;
  onSubmitReply: () => void;
  onLike: (id: string, isReply: boolean) => void;
  onDelete: (id: string, isReply: boolean) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const isReplying = replyingTo === comment.id;

  return (
    <div>
      {/* Top-level comment */}
      <div className="flex gap-3">
        <AvatarBubble name={comment.authorName} avatar={comment.authorAvatar} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {comment.authorUsername ? `@${comment.authorUsername}` : comment.authorName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {comment.isDeletedByAuthor ? (
            <p className="mt-1 text-sm italic text-muted-foreground/60">[Comment deleted]</p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{comment.body}</p>
          )}

          {/* Actions */}
          {!comment.isDeletedByAuthor && (
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => onLike(comment.id, false)}
                className={cn("flex items-center gap-1 text-xs transition-colors",
                  comment.isLiked ? "text-rose-500" : "text-muted-foreground hover:text-foreground")}
              >
                <HugeiconsIcon icon={FavouriteIcon} className={cn("h-3.5 w-3.5", comment.isLiked && "fill-current")} />
                {comment.likesCount > 0 && comment.likesCount}
              </button>
              {isSignedIn && (
                <button onClick={() => onSetReplyingTo(isReplying ? null : comment.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  Reply
                </button>
              )}
              {comment.isOwnComment && (
                <button
                  onClick={() => onDelete(comment.id, false)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete03Icon} className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Inline reply input */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <textarea
                  value={replyBody}
                  onChange={(e) => onReplyBodyChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmitReply(); }}
                  placeholder={`Reply to ${comment.authorName}…`}
                  rows={2}
                  maxLength={2000}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
                <div className="mt-1.5 flex items-center justify-end gap-2">
                  <button onClick={() => onSetReplyingTo(null)} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                  <button
                    onClick={onSubmitReply}
                    disabled={!replyBody.trim() || submitting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <HugeiconsIcon icon={SentIcon} className="h-3 w-3" />}
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-12 mt-3">
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            {showReplies ? <HugeiconsIcon icon={ArrowUp01Icon} className="h-3.5 w-3.5" /> : <HugeiconsIcon icon={ArrowDown01Icon} className="h-3.5 w-3.5" />}
            {showReplies ? "Hide" : "Show"} {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
          {showReplies && (
            <div className="space-y-4 border-l-2 border-border pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <AvatarBubble name={reply.authorName} avatar={reply.authorAvatar} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {reply.authorUsername ? `@${reply.authorUsername}` : reply.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {reply.isDeletedByAuthor ? (
                      <p className="mt-1 text-sm italic text-muted-foreground/60">[Reply deleted]</p>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{reply.body}</p>
                    )}
                    {!reply.isDeletedByAuthor && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => onLike(reply.id, true)}
                          className={cn("flex items-center gap-1 text-xs transition-colors",
                            reply.isLiked ? "text-rose-500" : "text-muted-foreground hover:text-foreground")}
                        >
                          <HugeiconsIcon icon={FavouriteIcon} className={cn("h-3.5 w-3.5", reply.isLiked && "fill-current")} />
                          {reply.likesCount > 0 && reply.likesCount}
                        </button>
                        {reply.isOwnComment && (
                          <button onClick={() => onDelete(reply.id, true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                            <HugeiconsIcon icon={Delete03Icon} className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

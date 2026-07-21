"use client";

import { Loader2, Send, BookOpen, Lock, Globe, Mail, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import type { CoAuthor, CoverImage, Series } from "./post-form-types";

interface EditPostPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  isDraft: boolean;
  onPublish: () => void;
  onPublishWithEmail: () => void;
  followerCount: number | null;
  coverImage: CoverImage;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  series: Series[];
  seriesId: string;
  access: "free" | "paid";
  coAuthors: CoAuthor[];
}

/**
 * EditPostPublishModal — the save/publish confirmation dialog for
 * EditPostPage. Kept separate from NewPostPage's equivalent
 * (./new-post-publish-modal.tsx) since the copy and available actions
 * depend on whether the post is still a draft or already live.
 */
export function EditPostPublishModal({
  isOpen, onClose, saving, isDraft, onPublish, onPublishWithEmail, followerCount,
  coverImage, title, excerpt, category, tags, series, seriesId, access, coAuthors,
}: EditPostPublishModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDraft ? "Ready to publish?" : "Save changes?"}
      description={isDraft ? "Review your post before it goes live." : "Your post is already live — changes will be visible immediately."}
      size="xl"
      isLoading={saving}
      closeOnOutsideClick={!saving}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} disabled={saving}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
            Cancel
          </button>
          <button onClick={onPublish} disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isDraft ? "Publish" : "Save changes"}
          </button>
          {isDraft && followerCount !== null && followerCount > 0 && (
            <button onClick={onPublishWithEmail} disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Publish + Email followers
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {coverImage && (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div>
          <h3 className="line-clamp-2 font-heading text-lg font-bold text-foreground">{title || "Untitled post"}</h3>
          {excerpt && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {category && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{category}</span>}
            {tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">#{t}</span>)}
            {seriesId && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><BookOpen className="h-3 w-3" />{series.find((s) => s.id === seriesId)?.title}</span>}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
              access === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {access === "paid" ? <><Lock className="h-3 w-3" /> Members only</> : <><Globe className="h-3 w-3" /> Free</>}
            </span>
          </div>
          {coAuthors.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Co-authors:</span>
              {coAuthors.map((ca) => (
                <span key={ca.userId} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {ca.name} <span className="text-muted-foreground/60">({ca.role})</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {isDraft && followerCount !== null && followerCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You have {followerCount.toLocaleString()} {followerCount === 1 ? "follower" : "followers"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Use <span className="font-semibold text-foreground">Publish + Email followers</span> to also send this post to their inboxes.
                They'll receive the title, excerpt{coverImage ? ", and cover image" : ""}. This can't be undone.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

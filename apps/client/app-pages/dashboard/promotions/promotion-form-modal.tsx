"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAdvert, useUpdateAdvert, type AdvertPlacement, type MyAdvert } from "@/hooks/use-my-adverts";
import type { EligiblePost } from "./promotion-types";

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: EligiblePost[];
  /** When set, edits this draft/rejected advert instead of creating a new one. */
  editing?: MyAdvert | null;
}

const MAX_BODY = 400;

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/**
 * PromotionFormModal — create (or revise) a "boost my post" promotion.
 *
 * Deliberately simple: the creative is derived from the chosen post (its
 * cover image, and title/excerpt as editable defaults) rather than a
 * separate upload flow — a creator is promoting a post they already wrote,
 * not designing a standalone ad. Placement is limited to feed_card /
 * in_article; notification_banner and modal_popup stay admin/house-only
 * (see app/api/adverts/route.ts).
 *
 * The wrapper below only computes a remount key (during render, not an
 * effect — React's documented alternative to "reset state on prop change")
 * so PromotionFormContent gets fresh lazily-initialized state each time the
 * modal opens for a new target, without ever needing to imperatively reset
 * state inside a useEffect. The key intentionally only changes on the
 * closed→open transition, not on close, so Modal's own closing animation
 * (driven by its internal isOpen-tracking state) still plays out.
 */
export function PromotionFormModal({ isOpen, onClose, posts, editing }: PromotionFormModalProps) {
  const [sessionKey, setSessionKey] = useState(() => editing?.id ?? "create");
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSessionKey(editing?.id ?? "create");
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  return <PromotionFormContent key={sessionKey} isOpen={isOpen} onClose={onClose} posts={posts} editing={editing} />;
}

function PromotionFormContent({ isOpen, onClose, posts, editing }: PromotionFormModalProps) {
  const isEditing = !!editing;

  const [postId,    setPostId]    = useState(() => editing?.postId ?? posts[0]?.id ?? "");
  const [title,     setTitle]     = useState(() => editing?.title ?? "");
  const [body,      setBody]      = useState(() => editing?.body ?? "");
  const [placement, setPlacement] = useState<AdvertPlacement>(() => editing?.placement ?? "feed_card");
  const [startAt,   setStartAt]   = useState(() => editing?.startAt?.slice(0, 10) ?? "");
  const [endAt,     setEndAt]     = useState(() => editing?.endAt?.slice(0, 10) ?? "");

  const createAdvert = useCreateAdvert();
  const updateAdvert = useUpdateAdvert();
  const saving = createAdvert.isPending || updateAdvert.isPending;

  const selectedPost = posts.find((p) => p.id === postId) ?? null;

  // Once a post is picked, default the title/blurb to its own copy — still editable.
  const handlePostChange = (id: string | null) => {
    if (!id) return;
    setPostId(id);
    const post = posts.find((p) => p.id === id);
    if (post && !isEditing) {
      setTitle((prev) => prev || post.title);
      setBody((prev) => prev || post.excerpt.slice(0, MAX_BODY));
    }
  };

  const buildBody = () => {
    const post = selectedPost;
    return {
      title: title.trim() || post?.title || "",
      body: body.trim(),
      image: post?.coverImage ?? null,
      ctaLabel: "Read more",
      ctaUrl: post ? `/post/${post.slug}` : "",
      startAt: startAt || null,
      endAt: endAt || null,
    };
  };

  const validate = () => {
    if (!postId) { toast.error("Choose a post to promote."); return false; }
    if (!(title.trim() || selectedPost?.title)) { toast.error("Title is required."); return false; }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
    try {
      if (isEditing) {
        await updateAdvert.mutateAsync({ id: editing!.id, ...buildBody() });
      } else {
        await createAdvert.mutateAsync({ type: "creator_promo", placement, postId, ...buildBody() });
      }
      toast.success("Draft saved.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save. Try again."));
    }
  };

  const submitForReview = async () => {
    if (!validate()) return;
    try {
      const id = isEditing
        ? editing!.id
        : (await createAdvert.mutateAsync({ type: "creator_promo", placement, postId, ...buildBody() })).id;
      if (isEditing) await updateAdvert.mutateAsync({ id, ...buildBody() });
      await updateAdvert.mutateAsync({ id, status: "pending_review" });
      toast.success("Submitted for review.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't submit. Try again."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Revise promotion" : "Promote a post"}
      description="Boost one of your posts in the feed. An admin reviews every promotion before it goes live."
      size="lg"
      isLoading={saving}
      closeOnOutsideClick={!saving}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={saveDraft} disabled={saving}
            className="rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
            Save draft
          </button>
          <button type="button" onClick={submitForReview} disabled={saving}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            Submit for review
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Post picker */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Post</label>
          {isEditing ? (
            <p className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground">
              {selectedPost?.title ?? "This post"}
            </p>
          ) : posts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3.5 py-2.5 text-sm text-muted-foreground">
              Publish a post first, then come back to promote it here.
            </p>
          ) : (
            <Select value={postId} onValueChange={handlePostChange}>
              <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
                <SelectValue placeholder="Choose a post" />
              </SelectTrigger>
              <SelectContent className="p-1">
                {posts.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedPost?.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selectedPost.coverImage.url} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
        )}

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Headline</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150}
            placeholder={selectedPost?.title || "Headline shown in the promotion"}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
        </div>

        {/* Blurb */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Blurb <span className="ml-1 font-normal text-muted-foreground">({body.length}/{MAX_BODY})</span>
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))} rows={3}
            placeholder={selectedPost?.excerpt || "A short line to draw readers in…"}
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
        </div>

        {/* Placement */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Where it shows</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlacement("feed_card")}
              className={cn("flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                placement === "feed_card" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
              Home feed
            </button>
            <button type="button" onClick={() => setPlacement("in_article")}
              className={cn("flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                placement === "in_article" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
              Inside other posts
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              Starts <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              Ends <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

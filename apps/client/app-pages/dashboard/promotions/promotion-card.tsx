"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeleteAdvert, useUpdateAdvert, type MyAdvert } from "@/hooks/use-my-adverts";
import { PromotionStatusBadge } from "./promotion-status-badge";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/**
 * One promotion row — same borderless "list row" shape as the reader-facing
 * RelatedPostCard (app-pages/post/post-related.tsx): text grows on the
 * left, a small square creative sits flush right, dividers between rows are
 * drawn by the parent list rather than each row carrying its own card box.
 */
export function PromotionCard({ advert, onEdit }: { advert: MyAdvert; onEdit: (advert: MyAdvert) => void }) {
  const updateAdvert = useUpdateAdvert();
  const deleteAdvert = useDeleteAdvert();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const busy = updateAdvert.isPending || deleteAdvert.isPending;

  const submitForReview = async () => {
    try {
      await updateAdvert.mutateAsync({ id: advert.id, status: "pending_review" });
      toast.success("Submitted for review.");
    } catch (err) { toast.error(errorMessage(err, "Couldn't submit. Try again.")); }
  };

  const togglePause = async () => {
    const next = advert.status === "paused" ? "active" : "paused";
    try {
      await updateAdvert.mutateAsync({ id: advert.id, status: next });
      toast.success(next === "paused" ? "Promotion paused." : "Promotion resumed.");
    } catch (err) { toast.error(errorMessage(err, "Couldn't update. Try again.")); }
  };

  const revise = async () => {
    try {
      await updateAdvert.mutateAsync({ id: advert.id, status: "draft" });
    } catch (err) { toast.error(errorMessage(err, "Couldn't revise. Try again.")); }
  };

  const remove = async () => {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    try {
      await deleteAdvert.mutateAsync(advert.id);
      toast.success("Promotion deleted.");
    } catch (err) { toast.error(errorMessage(err, "Couldn't delete. Try again.")); }
  };

  return (
    <div className="flex items-start gap-4 py-5">
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-heading text-base font-bold leading-snug text-foreground">{advert.title}</h3>
          <PromotionStatusBadge status={advert.status} />
        </div>

        {advert.body && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{advert.body}</p>
        )}

        {advert.status === "rejected" && advert.reviewNote && (
          <p className="mt-1.5 text-xs text-destructive">Admin note: {advert.reviewNote}</p>
        )}

        {["active", "paused", "scheduled", "completed"].includes(advert.status) && (
          <div className="mt-2 flex items-center gap-2.5 text-xs text-muted-foreground">
            <span>{advert.metrics.impressions.toLocaleString()} views</span>
            <span>{advert.metrics.clicks.toLocaleString()} clicks</span>
            <span>{(advert.metrics.ctr * 100).toFixed(1)}% CTR</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {advert.status === "draft" && (
            <>
              <button onClick={() => onEdit(advert)} disabled={busy}
                className="text-xs font-semibold text-foreground hover:text-primary disabled:opacity-50">
                Edit
              </button>
              <button onClick={submitForReview} disabled={busy}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                Submit for review
              </button>
              <button onClick={remove} disabled={busy}
                className={cn("text-xs font-semibold disabled:opacity-50",
                  confirmingDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
                {confirmingDelete ? "Confirm delete" : "Delete"}
              </button>
            </>
          )}

          {advert.status === "rejected" && (
            <>
              <button onClick={revise} disabled={busy}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                Revise
              </button>
              <button onClick={remove} disabled={busy}
                className={cn("text-xs font-semibold disabled:opacity-50",
                  confirmingDelete ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
                {confirmingDelete ? "Confirm delete" : "Delete"}
              </button>
            </>
          )}

          {(advert.status === "active" || advert.status === "scheduled") && (
            <button onClick={togglePause} disabled={busy}
              className="text-xs font-semibold text-foreground hover:text-primary disabled:opacity-50">
              Pause
            </button>
          )}

          {advert.status === "paused" && (
            <button onClick={togglePause} disabled={busy}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
              Resume
            </button>
          )}

          {advert.status === "pending_review" && (
            <span className="text-xs text-muted-foreground">Awaiting admin review</span>
          )}
        </div>
      </div>

      {/* Creative preview — flush right, no card treatment */}
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">
        {advert.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={advert.image.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground/50">No image</div>
        )}
      </div>
    </div>
  );
}

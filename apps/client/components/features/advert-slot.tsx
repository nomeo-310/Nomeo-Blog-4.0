"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAdvertSlot, type AdvertPlacement } from "@/hooks/use-advert";
import { cn } from "@/lib/utils";

/**
 * Advert rendering — Nomeo.
 * -------------------------
 * One component per placement (models/advert.ts's AdvertPlacement enum).
 * All of them are self-contained: mount one, it fetches its own ad via
 * useAdvertSlot and renders nothing when there isn't a live match.
 *
 * CTAs are real `<a href="/api/adverts/[id]/click">` links (not onClick
 * handlers) so click tracking survives new-tab opens and works without JS —
 * see app/api/adverts/[id]/click/route.ts.
 */

function AdLabel({ isHouse }: { isHouse: boolean }) {
  return (
    <span className="rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
      {isHouse ? "Nomeo" : "Sponsored"}
    </span>
  );
}

/* ── modal_popup ───────────────────────────────────────────────────────── */

export function AdvertPopup() {
  const { advert, clickUrl, dismiss, hide } = useAdvertSlot("modal_popup");
  if (!advert) return null;

  // Keyed by advert id so a fresh AdvertPopupContent mounts (with its own
  // fresh `visible` state) whenever the served ad changes, instead of
  // reaching back into an effect to reset state for the old one.
  return <AdvertPopupContent key={advert.id} advert={advert} clickUrl={clickUrl} dismiss={dismiss} hide={hide} />;
}

function AdvertPopupContent({
  advert, clickUrl, dismiss, hide,
}: {
  advert: NonNullable<ReturnType<typeof useAdvertSlot>["advert"]>;
  clickUrl: string;
  dismiss: () => void;
  hide: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), Math.max(0, advert.popupDelaySeconds) * 1000);
    return () => clearTimeout(timer);
  }, [advert.id, advert.popupDelaySeconds]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            setVisible(false);
            dismiss();
          }}
          className="fixed inset-0 z-[75000] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[1px] sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <AdLabel isHouse={advert.type === "house"} />
              <button
                type="button"
                onClick={() => {
                  setVisible(false);
                  dismiss();
                }}
                aria-label="Dismiss"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {advert.image?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advert.image.url} alt="" className="h-40 w-full object-cover" />
            )}

            <div className="p-4">
              <h3 className="font-heading text-base font-bold text-card-foreground">{advert.title}</h3>
              {advert.body && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{advert.body}</p>}

              {advert.ctaUrl && (
                <a
                  href={clickUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => {
                    setVisible(false);
                    hide();
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {advert.ctaLabel}
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── feed_card / in_article ───────────────────────────────────────────── */

export function AdvertCard({
  placement = "feed_card",
  topics,
  className,
}: {
  placement?: Extract<AdvertPlacement, "feed_card" | "in_article">;
  topics?: string[];
  className?: string;
}) {
  const { advert, clickUrl, hide } = useAdvertSlot(placement, { topics });
  if (!advert) return null;

  return (
    <a
      href={clickUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={hide}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-md",
        className
      )}
    >
      <div className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {advert.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={advert.image.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-xs font-semibold text-primary/40">{advert.type === "house" ? "Nomeo" : "Ad"}</span>
          </div>
        )}
        <span className="absolute left-3 top-3">
          <AdLabel isHouse={advert.type === "house"} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-heading text-base font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {advert.title}
        </h3>
        {advert.body && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{advert.body}</p>}
        {advert.ctaLabel && (
          <span className="mt-auto pt-4 text-xs font-semibold text-primary">{advert.ctaLabel} →</span>
        )}
      </div>
    </a>
  );
}

/* ── notification_banner ──────────────────────────────────────────────── */

export function AdvertBanner({ className }: { className?: string }) {
  const { advert, clickUrl, dismiss } = useAdvertSlot("notification_banner");
  if (!advert) return null;

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3", className)}>
      <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored" className="flex min-w-0 flex-1 items-center gap-3">
        {advert.image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={advert.image.url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{advert.title}</p>
          {advert.body && <p className="truncate text-xs text-muted-foreground">{advert.body}</p>}
        </div>
      </a>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={clickUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {advert.ctaLabel}
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

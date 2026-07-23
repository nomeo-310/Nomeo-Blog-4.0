"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export type AdvertType = "sponsored" | "house" | "promoted_post" | "creator_promo";
export type AdvertPlacement = "feed_card" | "in_article" | "notification_banner" | "modal_popup";

export interface AdvertPayload {
  id: string;
  type: AdvertType;
  placement: AdvertPlacement;
  title: string;
  body: string;
  image: { url: string; width: number | null; height: number | null } | null;
  ctaLabel: string;
  ctaUrl: string;
  dismissBehavior: "once" | "session" | "always";
  popupDelaySeconds: number;
}

const SESSION_DISMISS_PREFIX = "nomeo_ad_dismissed_";

function isDismissedThisSession(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_DISMISS_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

/**
 * Relative paths (creator_promo/promoted_post always point at /post/[slug])
 * are internal; absolute http(s) URLs to another origin are external. Used
 * to decide same-tab <Link> + beacon tracking vs. new-tab redirect-tracker.
 */
export function isInternalUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Fetches the best-fit advert for a placement slot and tracks its lifecycle:
 *   - impression fires once, automatically, the first time an advert renders
 *   - `dismiss()` — explicit close (X button): records server-side, and for
 *     dismissBehavior "session" also hides it locally for the rest of the tab
 *   - `hide()` — silent local hide after a click-through (the click itself is
 *     tracked by navigating to clickUrl, not by this hook)
 */
export function useAdvertSlot(placement: AdvertPlacement, options?: { topics?: string[]; enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const topics = options?.topics ?? [];
  const topicsKey = topics.join(",");

  const impressionFired = useRef<string | null>(null);
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  const query = useQuery<AdvertPayload | null>({
    queryKey: ["advert-slot", placement, topicsKey],
    queryFn: async () => {
      const params = new URLSearchParams({ placement });
      if (topicsKey) params.set("topics", topicsKey);
      const { data } = await api.get<{ advert: AdvertPayload | null }>(`/api/adverts/serve?${params.toString()}`);
      return data.advert;
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const advert = useMemo(() => {
    const a = query.data;
    if (!a) return null;
    if (a.id === hiddenId) return null;
    if (isDismissedThisSession(a.id)) return null;
    return a;
  }, [query.data, hiddenId]);

  useEffect(() => {
    if (!advert || impressionFired.current === advert.id) return;
    impressionFired.current = advert.id;
    api.post(`/api/adverts/${advert.id}/impression`).catch(() => {});
  }, [advert]);

  const dismiss = useCallback(() => {
    if (!advert) return;
    if (advert.dismissBehavior === "session") {
      try {
        sessionStorage.setItem(SESSION_DISMISS_PREFIX + advert.id, "1");
      } catch {
        // storage unavailable (private mode etc.) — falls back to per-render hide
      }
    }
    setHiddenId(advert.id);
    api.post(`/api/adverts/${advert.id}/dismiss`).catch(() => {});
  }, [advert]);

  const hide = useCallback(() => {
    if (!advert) return;
    setHiddenId(advert.id);
  }, [advert]);

  // Internal destinations (another Nomeo page) navigate same-tab via <Link>
  // and track the click with this fire-and-forget beacon instead of routing
  // through the redirect endpoint — see components/features/advert-slot.tsx.
  const trackClick = useCallback(() => {
    if (!advert) return;
    api.post(`/api/adverts/${advert.id}/click`).catch(() => {});
  }, [advert]);

  return {
    advert,
    isLoading: query.isLoading,
    /** External destinations only: <a href={clickUrl} target="_blank"> — records the click server-side, then redirects. */
    clickUrl: advert ? `/api/adverts/${advert.id}/click` : "#",
    /** True when advert.ctaUrl points within Nomeo (same-tab <Link> territory). */
    isInternal: advert ? isInternalUrl(advert.ctaUrl) : false,
    trackClick,
    dismiss,
    hide,
  };
}

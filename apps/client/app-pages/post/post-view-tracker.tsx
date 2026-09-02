"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { authClient } from "@/lib/authClient";

const KEY_VERSION = "v1";

interface PostViewTrackerProps {
  postSlug: string;
  canRead:  boolean;
}

export function PostViewTracker({ postSlug, canRead }: PostViewTrackerProps) {
  const router   = useRouter();
  const { data: session } = authClient.useSession();

  const user = session?.user;


  const firedRef = useRef<Set<string>>(new Set());

  // Generate or get a session ID that persists for the browser session
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('quilhub:sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('quilhub:sessionId', sessionId);
    }
    return sessionId;
  };

  useEffect(() => {
    if (!canRead) return;
    if (!user?.id) return;

    const sessionId = getSessionId();
    // Include both userId and sessionId for maximum uniqueness
    const viewKey = `quilhub:viewed:${KEY_VERSION}:${user.id}:${sessionId}:${postSlug}`;

    if (sessionStorage.getItem(viewKey)) return;
    if (firedRef.current.has(`${user.id}:${sessionId}:${postSlug}`)) return;

    sessionStorage.setItem(viewKey, "1");
    firedRef.current.add(`${user.id}:${sessionId}:${postSlug}`);

    axios
      .post(`/api/posts/${postSlug}/view`, {}, { withCredentials: true })
      .then(() => {
        router.refresh();
      })
      .catch(() => {
        sessionStorage.removeItem(viewKey);
        firedRef.current.delete(`${user.id}:${sessionId}:${postSlug}`);
      });

  }, [postSlug, canRead, user?.id, router]);

  // ── Reading-progress tracking ──────────────────────────────────────────
  // Feeds readDurationSeconds/completedRead on the PostRead row, which the
  // monthly earnings job weights subscriber read-minutes by. Tracks only
  // time the tab is actually visible, and "completed" as having scrolled
  // near the bottom of the page.
  useEffect(() => {
    if (!canRead || !user?.id) return;

    let activeSeconds = 0;
    let completed = false;
    let lastTickAt = Date.now();

    const tick = () => {
      if (document.visibilityState === "visible") {
        activeSeconds += (Date.now() - lastTickAt) / 1000;
      }
      lastTickAt = Date.now();
    };

    const checkCompletion = () => {
      if (completed) return;
      const scrolled = window.scrollY + window.innerHeight;
      const full = document.documentElement.scrollHeight;
      if (full > 0 && scrolled >= full - 200) completed = true;
    };

    const send = (useBeacon: boolean) => {
      tick();
      checkCompletion();
      const payload = JSON.stringify({ durationSeconds: Math.round(activeSeconds), completed });
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/posts/${postSlug}/view`,
          new Blob([payload], { type: "application/json" })
        );
      } else {
        axios.patch(`/api/posts/${postSlug}/view`, JSON.parse(payload), { withCredentials: true }).catch(() => {});
      }
    };

    const onScroll = () => checkCompletion();
    const onVisibilityChange = () => {
      tick();
      if (document.visibilityState === "hidden") send(true);
    };
    const onPageHide = () => send(true);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    const interval = setInterval(() => send(false), 20_000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
      send(true);
    };
  }, [postSlug, canRead, user?.id]);

  return null;
}
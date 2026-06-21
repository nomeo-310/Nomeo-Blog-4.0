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
    let sessionId = sessionStorage.getItem('nomeo:sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('nomeo:sessionId', sessionId);
    }
    return sessionId;
  };

  useEffect(() => {
    if (!canRead) return;
    if (!user?.id) return;

    const sessionId = getSessionId();
    // Include both userId and sessionId for maximum uniqueness
    const viewKey = `nomeo:viewed:${KEY_VERSION}:${user.id}:${sessionId}:${postSlug}`;

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

  return null;
}
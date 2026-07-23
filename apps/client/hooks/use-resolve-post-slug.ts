"use client";

import { useCallback, useState } from "react";
import { resolvePostSlug } from "@/lib/resolve-post-slug";

/**
 * Thin stateful wrapper around resolvePostSlug() for components that want
 * to show a loading affordance while resolving (e.g. a notification row
 * that only has a Post _id, not its slug) before navigating.
 *
 * Deliberately imperative (call resolve() from a click handler) rather
 * than a data-fetching query — a notification list can have dozens of
 * rows and only the one actually clicked needs resolving, not all of them
 * up front.
 */
export function useResolvePostSlug() {
  const [isResolving, setIsResolving] = useState(false);

  const resolve = useCallback(async (postIdOrSlug: string): Promise<string | null> => {
    setIsResolving(true);
    try {
      return await resolvePostSlug(postIdOrSlug);
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolve, isResolving };
}

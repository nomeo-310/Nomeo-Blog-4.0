// hooks/use-redirect-after-login.ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { consumeRedirectIntent } from "@/lib/redirect-storage";

/**
 * Call this once, right after a successful login OR signup — wire it
 * into both success handlers in your auth modal, since the same logic
 * applies whether the visitor logged in or just created an account.
 *
 * Sends the user back to wherever they were before being asked to log
 * in. Returns true if it redirected, false if nothing was saved — use
 * the false case to fall back to your current behavior (e.g. going
 * home).
 *
 * Usage inside your auth modal:
 *   const redirectAfterLogin = useRedirectAfterLogin();
 *   ...
 *   onSuccess: () => {
 *     closeModal();
 *     if (!redirectAfterLogin()) router.push("/");
 *   }
 */
export function useRedirectAfterLogin() {
  const router = useRouter();
  return useCallback(() => {
    const path = consumeRedirectIntent();
    if (!path) return false;
    router.push(path);
    return true;
  }, [router]);
}
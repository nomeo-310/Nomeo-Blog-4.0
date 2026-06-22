// lib/redirect-storage.ts
"use client";

const STORAGE_KEY = "nomeo:redirect-after-login";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes — older saves are ignored, not acted on

/**
 * Remembers the current page (or an explicit `path`) so the user can be
 * sent back after they log in or sign up. Call this right before
 * opening your login modal from any gated action — liking, commenting,
 * reading a post, joining a lounge, etc.
 */
export function saveRedirectIntent(path?: string) {
  if (typeof window === "undefined") return;
  const target = path ?? `${window.location.pathname}${window.location.search}`;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ path: target, savedAt: Date.now() }));
  } catch {
    // localStorage can throw in private browsing / storage-full edge cases — non-fatal, just skip
  }
}

/**
 * Reads the saved path WITHOUT clearing it. Use this when you need the
 * path early (e.g. to pass as a callbackURL to an OAuth redirect) but
 * want the intent to survive in case the flow fails or the user cancels
 * on the provider's side and comes back. The post-login handler
 * (consumeRedirectIntent) will clear it once they're actually back and
 * authenticated.
 */
export function peekRedirectIntent(): { path: string; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.path || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Reads AND clears the saved path in one step — call this once, right
 * after a successful login/signup, so a later page refresh doesn't
 * redirect again. Returns null if nothing was saved, or it's stale.
 */
export function consumeRedirectIntent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(STORAGE_KEY);
    const { path, savedAt } = JSON.parse(raw);
    if (!path || typeof savedAt !== "number" || Date.now() - savedAt > MAX_AGE_MS) return null;
    return path as string;
  } catch {
    return null;
  }
}
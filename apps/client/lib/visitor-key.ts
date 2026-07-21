import { cookies } from "next/headers";
import { nanoid } from "nanoid";

/**
 * Anonymous visitor identity for logged-out ad delivery/tracking (frequency
 * capping, dismissal memory) — mirrors AdvertImpression.visitorKey. HttpOnly
 * so it can't be read/tampered with from the client; long-lived like a
 * standard ad-tech visitor cookie.
 */
const COOKIE_NAME = "nomeo_vk";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Read the visitor key without creating one (safe in Server Components). */
export async function getVisitorKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** Read the visitor key, minting and persisting a new one if missing. Route Handlers only. */
export async function ensureVisitorKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const key = nanoid();
  store.set(COOKIE_NAME, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return key;
}

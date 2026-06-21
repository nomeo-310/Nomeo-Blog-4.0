// lib/server/ably.ts
import Ably from "ably";

/**
 * Ably (server-side).
 * -------------------
 * One REST client for the server: issues short-lived token requests for
 * clients and publishes server-originated events. The API key is server-only.
 *
 * Env:
 *   ABLY_API_KEY   (server secret — no NEXT_PUBLIC_ prefix)
 *
 * Channel naming: `lounge:<loungeId>` — one channel per lounge.
 */

const ABLY_API_KEY = process.env.ABLY_API_KEY;

if (!ABLY_API_KEY && process.env.NODE_ENV === "production") {
  console.error("ABLY_API_KEY is not set — live chat will not work.");
}

// REST client (not Realtime) — server only publishes + mints tokens.
export const ablyRest = new Ably.Rest(ABLY_API_KEY ?? "disabled");

export const loungeChannel = (loungeId: string) => `lounge:${loungeId}`;

/** Publish a server-side event to a lounge channel (e.g. a saved message). */
export async function publishToLounge(loungeId: string, event: string, data: unknown) {
  const channel = ablyRest.channels.get(loungeChannel(loungeId));
  await channel.publish(event, data);
}

export const dmChannel = (conversationId: string) => `dm:${conversationId}`;

/** Publish a server-side event to a DM conversation channel. */
export async function publishToDm(conversationId: string, event: string, data: unknown) {
  const channel = ablyRest.channels.get(dmChannel(conversationId));
  await channel.publish(event, data);
}

export const userChannel = (userId: string) => `user:${userId}`;

/**
 * Notify a single user's personal channel that their activity changed
 * (a new notification or connection request). The client refetches its counts
 * on receipt — payload is intentionally tiny; we don't push the content itself.
 */
export async function bumpUserActivity(userId: string, kind: "notification" | "connection") {
  const channel = ablyRest.channels.get(userChannel(userId));
  await channel.publish("activity.bump", { kind, at: Date.now() });
}
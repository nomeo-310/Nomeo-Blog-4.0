"use client";

import type * as Ably from "ably";

/**
 * Ably client registry — Nomeo.
 * -----------------------------
 * A tiny module-level set of every live Ably Realtime client (lounge chat, DM,
 * activity bell). Each chat hook registers its client on connect and removes it
 * on unmount. This lets logout tear down ALL realtime cleanly in one call:
 * leave presence (so you stop showing as "online" in lounges) and close the
 * sockets — deliberately and in order, instead of racing a page reload.
 *
 * Note: this disconnects realtime only. It does NOT change lounge membership —
 * you stay a member of every lounge you've joined; you just go offline.
 */

const clients = new Set<Ably.Realtime>();

export function registerAblyClient(client: Ably.Realtime) {
  clients.add(client);
}

export function unregisterAblyClient(client: Ably.Realtime) {
  clients.delete(client);
}

/**
 * Leave presence on every channel of every client, then close every client.
 * Best-effort and resilient: one failure never blocks the rest. Resolves once
 * all leaves have settled (or a short timeout elapses) so logout can await it.
 */
export async function teardownRealtime(timeoutMs = 1500): Promise<void> {
  const all = [...clients];

  const leaves: Promise<unknown>[] = [];
  for (const client of all) {
    try {
      // Leave presence on any channel we're present on.
      const channels = (client.channels as any).all
        ? Object.values((client.channels as any).all)
        : [];
      for (const ch of channels as Ably.RealtimeChannel[]) {
        try {
          // Only channels we actually entered have presence to leave.
          leaves.push(Promise.resolve(ch.presence.leave()).catch(() => {}));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Wait for presence leaves to flush, but never hang logout on it.
  await Promise.race([
    Promise.allSettled(leaves),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  // Now close every client.
  for (const client of all) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    clients.delete(client);
  }
}
// app/api/presence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ablyRest, userChannel } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/presence?userIds=a,b,c
 * -------------------------------
 * Returns which of the given users are currently online, by checking Ably
 * presence on each user's own `user:<id>` channel (they enter presence app-wide
 * when logged in). Response: { online: { [userId]: boolean } }.
 *
 * On-demand check (not a live subscription) — the inbox calls this for its
 * conversation list and can re-poll periodically.
 */
const MAX_USERS = 50;

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = new URL(req.url).searchParams.get("userIds") ?? "";
    const userIds = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_USERS);
    if (userIds.length === 0) return NextResponse.json({ online: {} });

    // Query Ably presence on each user's channel in parallel.
    const entries = await Promise.all(
      userIds.map(async (uid) => {
        try {
          const channel = ablyRest.channels.get(userChannel(uid));
          const page = await channel.presence.get({ limit: 1 });
          const isOnline = (page.items?.length ?? 0) > 0;
          return [uid, isOnline] as const;
        } catch {
          return [uid, false] as const;
        }
      })
    );

    const online: Record<string, boolean> = {};
    for (const [uid, isOnline] of entries) online[uid] = isOnline;

    return NextResponse.json({ online });
  } catch (error) {
    console.error("[GET /api/presence]", error);
    return NextResponse.json({ error: "Presence check failed" }, { status: 500 });
  }
}
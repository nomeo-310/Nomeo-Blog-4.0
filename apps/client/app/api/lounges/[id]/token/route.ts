// app/api/lounges/[id]/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ablyRest, loungeChannel } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { joinOpenLounge, resolveLoungeAccess } from "@/services/lounge-access-services";

// Ably token requests must never be cached, or clients get stale auth.
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/lounges/[id]/token
 * ---------------------------
 * Ably token auth. The client requests a token before connecting; we verify
 * the user can access THIS lounge (via resolveLoungeAccess) and mint a token
 * scoped to only this lounge's channel. A banned / unauthorised user gets 403
 * and can never subscribe — access control reaches the socket layer.
 *
 * Capabilities granted:
 *   - subscribe + presence always (if canView)
 *   - publish only if canChat (used for typing events; messages still POST
 *     through the server so they persist + are access-checked again)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Open lounges: lightweight auto-join so the membership row exists.
    // (Safe to call repeatedly; it's idempotent. Throws only if banned/closed.)
    try {
      await joinOpenLounge(id, user.id);
    } catch {
      // Not an open lounge, or join not applicable — fall through to access check.
    }

    const access = await resolveLoungeAccess(id, user.id);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden", reason: access.reason }, { status: 403 });
    }

    const channel = loungeChannel(id);
    const ops: string[] = access.canChat
      ? ["subscribe", "presence", "history", "publish"]
      : ["subscribe", "presence", "history"];

    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId: user.id, // ties presence entries to the user
      // capability is typed as a JSON string in TokenParams
      capability: JSON.stringify({ [channel]: ops }),
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[GET /api/lounges/[id]/token]", error);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
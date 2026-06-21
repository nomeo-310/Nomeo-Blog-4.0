// app/api/activity/token/route.ts
import { NextResponse } from "next/server";
import { ablyRest, userChannel } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";

// Never cache token requests.
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/activity/token
 * Mints an Ably token scoped to the caller's OWN user channel
 * (`user:<id>`), subscribe-only. Used by the navbar bell to receive live
 * activity bumps (new notification / connection request).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const channel = userChannel(user.id);
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId: user.id,
      capability: JSON.stringify({ [channel]: ["subscribe", "presence"] }),
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[GET /api/activity/token]", error);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
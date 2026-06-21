// app/api/dm/conversations/[id]/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ablyRest, dmChannel } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { assertCanUseConversation } from "@/services/dm-access-services";

// Never cache token requests.
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/dm/conversations/[id]/token
 * Ably token auth for a DM channel. Verifies the user is a participant AND
 * still allowed to message (connection + block) before minting a token scoped
 * to only this conversation's channel.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      await assertCanUseConversation(id, user.id);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }

    const channel = dmChannel(id);
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId: user.id,
      capability: JSON.stringify({ [channel]: ["subscribe", "presence", "history", "publish"] }),
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[GET /api/dm/.../token]", error);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
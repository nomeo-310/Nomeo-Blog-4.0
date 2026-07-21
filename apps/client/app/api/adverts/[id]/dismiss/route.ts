import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { ensureVisitorKey } from "@/lib/visitor-key";
import { recordDismiss } from "@/services/advert-services";

export const dynamic = "force-dynamic";

/**
 * POST /api/adverts/[id]/dismiss
 * --------------------------------
 * Fired when the viewer explicitly closes a popup (the X button, not a
 * click-through). Whether this suppresses future delivery depends on the
 * advert's dismissBehavior — "once" excludes it permanently for this viewer,
 * "session"/"always" don't (see selectAdvertForPlacement). Public.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ ok: false }, { status: 400 });

    const user = await getCurrentUser().catch(() => null);
    const visitorKey = user ? null : await ensureVisitorKey();

    await connectDB();
    await recordDismiss(id, { userId: user?.id ?? null, visitorKey });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/adverts/[id]/dismiss]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

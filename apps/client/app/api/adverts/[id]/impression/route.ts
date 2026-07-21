import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { ensureVisitorKey } from "@/lib/visitor-key";
import { recordImpression } from "@/services/advert-services";

export const dynamic = "force-dynamic";

/**
 * POST /api/adverts/[id]/impression
 * ----------------------------------
 * Fired by the client once an advert actually rendered on screen (not on
 * fetch — a slot that fetched an ad but never mounted it shouldn't count).
 * Public: works for signed-in users and anonymous visitors alike.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ ok: false }, { status: 400 });

    const user = await getCurrentUser().catch(() => null);
    const visitorKey = user ? null : await ensureVisitorKey();

    await connectDB();
    await recordImpression(id, { userId: user?.id ?? null, visitorKey });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/adverts/[id]/impression]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

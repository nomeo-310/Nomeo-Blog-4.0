import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { ensureVisitorKey } from "@/lib/visitor-key";
import { selectAdvertForPlacement, serializeAdvertForClient } from "@/services/advert-services";
import type { AdvertPlacement } from "@/models/advert";

export const dynamic = "force-dynamic";

const PLACEMENTS: AdvertPlacement[] = ["hero", "feed_card", "in_article", "notification_banner", "modal_popup"];

/**
 * GET /api/adverts/serve?placement=modal_popup&topics=tech,design
 * ------------------------------------------------------------------
 * Public delivery endpoint — the one call every ad slot on the site makes.
 * Resolves the viewer (signed-in user, or an anonymous visitorKey cookie),
 * picks the best-fit live advert for the slot (or null if none qualify),
 * and returns just the creative + display rules. Read-only: does not count
 * as an impression — call POST /api/adverts/[id]/impression once the ad is
 * actually rendered on screen.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement") as AdvertPlacement | null;
    const topics = (searchParams.get("topics") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!placement || !PLACEMENTS.includes(placement)) {
      return NextResponse.json({ advert: null, error: "Invalid or missing placement" }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);
    const visitorKey = user ? null : await ensureVisitorKey();

    await connectDB();

    const advert = await selectAdvertForPlacement({
      placement,
      userId: user?.id ?? null,
      visitorKey,
      topics,
    });

    return NextResponse.json({ advert: advert ? serializeAdvertForClient(advert) : null });
  } catch (err) {
    console.error("[GET /api/adverts/serve]", err);
    return NextResponse.json({ advert: null }, { status: 500 });
  }
}

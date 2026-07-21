import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Advert, type IAdvert } from "@/models/advert";
import { getCurrentUser } from "@/lib/session";
import { ensureVisitorKey } from "@/lib/visitor-key";
import { recordClick } from "@/services/advert-services";

export const dynamic = "force-dynamic";

/**
 * GET /api/adverts/[id]/click
 * -----------------------------
 * Standard ad click-tracker pattern: every CTA/card renders as
 * `<a href="/api/adverts/[id]/click" target="_blank" rel="noopener sponsored">`
 * rather than a JS onClick handler, so tracking survives new-tab opens, JS
 * failures, and middle-clicks. Records the click server-side, then 302s to
 * the advert's ctaUrl. Public.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const fallback = NextResponse.redirect(new URL("/", req.url));
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return fallback;

    await connectDB();
    const advert = await Advert.findById(id).select("ctaUrl").lean<Pick<IAdvert, "ctaUrl"> | null>();
    if (!advert?.ctaUrl) return fallback;

    const user = await getCurrentUser().catch(() => null);
    const visitorKey = user ? null : await ensureVisitorKey();
    await recordClick(id, { userId: user?.id ?? null, visitorKey });

    const isAbsolute = /^https?:\/\//i.test(advert.ctaUrl);
    const target = isAbsolute ? advert.ctaUrl : new URL(advert.ctaUrl, req.url).toString();
    return NextResponse.redirect(target);
  } catch (err) {
    console.error("[GET /api/adverts/[id]/click]", err);
    return fallback;
  }
}

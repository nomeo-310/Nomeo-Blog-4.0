// app/api/writers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTopWriters } from "@/lib/get-top-writers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic    = "force-dynamic";
export const revalidate = 3600;

/**
 * GET /api/writers
 * ----------------
 * Top active creators by follower count, each with a preview of their
 * recent paid and free posts. Backs the About page's writer grid and the
 * /writers directory page (app-pages/writers/writers-page.tsx) — the
 * latter fetches getTopWriters() directly server-side rather than calling
 * this route, but both share the same aggregation in lib/get-top-writers.ts.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: `writers:${ip}`, limit: 30, windowSeconds: 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const writers = await getTopWriters();
    return NextResponse.json({ writers });
  } catch (error) {
    console.error("[GET /api/writers]", error);
    return NextResponse.json({ writers: [] });
  }
}

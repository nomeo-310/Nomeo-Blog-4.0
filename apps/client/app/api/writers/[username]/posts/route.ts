// app/api/writers/[username]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWriterPosts } from "@/lib/get-writer-posts";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/writers/:username/posts
 * ----------------------------------
 * Full paid/free post lists for one writer — backs the "view details" modal
 * on /writers (app-pages/writers/writer-detail-modal.tsx). The grid itself
 * only carries a short preview per writer (see getTopWriters); this is
 * fetched on demand only when a card's modal is actually opened.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: `writer-posts:${ip}`, limit: 30, windowSeconds: 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const { username } = await params;
    const posts = await getWriterPosts(username);
    if (!posts) return NextResponse.json({ error: "Writer not found" }, { status: 404 });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[GET /api/writers/:username/posts]", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

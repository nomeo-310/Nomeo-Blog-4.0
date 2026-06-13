import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to database";


/**
 * Newsletter unsubscribe.
 *
 * GET  /api/newsletter/unsubscribe?token=...
 *   Clicked from an email's unsubscribe link → flips isUnsubscribed = true,
 *   then redirects to a friendly status page.
 *
 * POST /api/newsletter/unsubscribe?token=...
 *   RFC 8058 one-click unsubscribe (the List-Unsubscribe-Post header points
 *   here). Returns 200 with no redirect — mail clients call this directly.
 */

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  await connectDB();
  const col = mongoose.connection.db!.collection("newslettersubscribers");
  const now = new Date();
  const res = await col.updateOne(
    { unsubscribeToken: token },
    { $set: { isUnsubscribed: true, unsubscribedAt: now, updatedAt: now } }
  );
  return res.matchedCount > 0;
}

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const token = new URL(req.url).searchParams.get("token");
  try {
    const ok = await unsubscribe(token);
    return Response.redirect(`${base}/newsletter/${ok ? "unsubscribed" : "invalid"}`, 302);
  } catch (error) {
    console.error("[GET /api/newsletter/unsubscribe]", error);
    return Response.redirect(`${base}/newsletter/invalid`, 302);
  }
}

export async function POST(req: NextRequest) {
  // One-click (RFC 8058). Mail clients POST here; respond 200 regardless of
  // whether the token matched, so we don't leak subscriber existence.
  const token = new URL(req.url).searchParams.get("token");
  try {
    await unsubscribe(token);
  } catch (error) {
    console.error("[POST /api/newsletter/unsubscribe]", error);
  }
  return new Response(null, { status: 200 });
}
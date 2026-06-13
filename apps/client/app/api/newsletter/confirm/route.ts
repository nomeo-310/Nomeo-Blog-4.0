import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to database";

/**
 * GET /api/newsletter/confirm?token=...
 * -------------------------------------
 * Clicked from the confirmation email. Flips isConfirmed = true for the
 * subscriber matching the token, then redirects to a friendly status page.
 *
 * Redirects (build these pages, or point them at existing ones):
 *   /newsletter/confirmed   — success
 *   /newsletter/invalid     — token missing / not found
 */
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return Response.redirect(`${base}/newsletter/invalid`, 302);
  }

  try {
    await connectDB();
    const col = mongoose.connection.db!.collection("newslettersubscribers");

    const now = new Date();
    const res = await col.updateOne(
      { unsubscribeToken: token },
      {
        $set: {
          isConfirmed: true,
          confirmedAt: now,
          // Re-confirming also clears any prior unsubscribe.
          isUnsubscribed: false,
          unsubscribedAt: null,
          updatedAt: now,
        },
      }
    );

    if (res.matchedCount === 0) {
      return Response.redirect(`${base}/newsletter/invalid`, 302);
    }

    return Response.redirect(`${base}/newsletter/confirmed`, 302);
  } catch (error) {
    console.error("[GET /api/newsletter/confirm]", error);
    return Response.redirect(`${base}/newsletter/invalid`, 302);
  }
}
import { NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { mailService } from "@/services/email-services";

/**
 * POST /api/newsletter  { email }
 * -------------------------------
 * Subscribe to the platform newsletter (double opt-in). Creates/updates a
 * NewsletterSubscriber with status "pending" and emails a confirmation link.
 *
 * Idempotent + privacy-preserving:
 *   - Already-confirmed email → same generic success (don't reveal status).
 *   - New/pending → (re)send confirmation.
 */

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !EMAIL_RX.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const normalized = String(email).toLowerCase().trim();
    await connectDB();
    const col = mongoose.connection.db!.collection("newslettersubscribers");

    const existing = await col.findOne({ email: normalized });

    // Already confirmed → generic success, no resend.
    if (existing?.isConfirmed && !existing?.isUnsubscribed) {
      return Response.json({ success: true, message: "You're already subscribed." });
    }

    // Create or refresh a pending (unconfirmed) subscription with a new token.
    const token = crypto.randomBytes(32).toString("hex");
    const now = new Date();

    await col.updateOne(
      { email: normalized },
      {
        $set: {
          isConfirmed: false,
          isUnsubscribed: false,
          unsubscribeToken: token,
          source: "footer_form",
          updatedAt: now,
        },
        $setOnInsert: { email: normalized, createdAt: now },
      },
      { upsert: true }
    );

    // Send the confirmation email (double opt-in).
    try {
      await mailService.sendNewsletterConfirmation({ email: normalized, token });
    } catch (e) {
      // Don't fail the request if the email send hiccups — the record exists
      // and they can re-subscribe. Log for visibility.
      console.error("Newsletter confirmation email failed:", e);
    }

    return Response.json({
      success: true,
      message: "Almost there — check your inbox to confirm.",
    });
  } catch (error) {
    console.error("[POST /api/newsletter]", error);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
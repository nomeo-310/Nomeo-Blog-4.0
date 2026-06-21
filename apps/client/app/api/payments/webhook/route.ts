// app/api/payments/webhook/route.ts
import { connectDB } from "@/lib/connect-to-database";
import { PaymentService } from "@/services/payment-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/payments/webhook
 * --------------------------
 * Paystack webhook. Must read the RAW body to validate the HMAC SHA512
 * signature before trusting anything. Set the webhook URL in the Paystack
 * dashboard to https://yourdomain.com/api/payments/webhook.
 *
 * Always 200s quickly on success so Paystack doesn't retry; 401 on signature
 * failure.
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return NextResponse.json({ success: false, message: "Missing signature" }, { status: 401 });
    }

    const rawBody = await req.text(); // raw, unparsed — required for HMAC

    await connectDB();
    const result = await PaymentService.handleWebhook(rawBody, signature);

    if (!result.handled) {
      console.info(`[Webhook] Unhandled event: ${result.event}`);
    }

    return NextResponse.json({ success: true, received: true }, { status: 200 });
  } catch (error) {
    const message = (error as Error).message ?? "Webhook processing failed";
    console.error("[POST /api/payments/webhook]", error);
    const status = message.includes("signature") ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
// app/api/payments/verify/[reference]/route.ts
import { connectDB } from "@/lib/connect-to-database";
import { PaymentService } from "@/services/payment-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/payments/verify/:reference
 * -----------------------------------
 * Polling safety-net for the frontend while waiting on the webhook. Verifies
 * the transaction against Paystack and returns its current status.
 * The webhook remains the source of truth for production.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    if (!reference) {
      return NextResponse.json({ success: false, message: "Payment reference is required" }, { status: 400 });
    }

    await connectDB();
    const payment = await PaymentService.verify(reference);

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment._id,
          reference: payment.reference,
          gatewayStatus: payment.gatewayStatus,
          amount: payment.amount,
          amountPaid: payment.amountPaid,
          currency: payment.currency,
          paidAt: payment.paidAt,
          purpose: payment.purpose,
          channel: payment.channel,
          gatewayResponse: payment.gatewayResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/payments/verify]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message ?? "Verification failed" },
      { status: 500 }
    );
  }
}
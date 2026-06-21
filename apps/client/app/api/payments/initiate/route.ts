// app/api/payments/initiate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Plan } from "@/models/plan";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";
import { PaymentService } from "@/services/payment-service";

/**
 * POST /api/payments/initiate  { planId }
 * ---------------------------------------
 * Starts a subscription payment. The amount + Paystack plan code are taken
 * from the Plan server-side — the client only sends planId, so the price can't
 * be tampered with. Returns the reference + access code for the Paystack modal.
 *
 * The subscription record does NOT exist yet — it's created by
 * POST /api/subscriptions after the payment verifies.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ success: false, message: "planId is required" }, { status: 400 });
    }

    await connectDB();

    const plan = await Plan.findOne({ _id: planId, status: "active" });
    if (!plan) {
      return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });
    }

    // Price comes from the plan, never the client.
    const result = await PaymentService.initiate({
      email: user.email,
      userId: user.id,
      planId: String(plan._id),
      amount: plan.priceAmount,
      currency: plan.currency,
      paystackPlanCode: plan.externalPriceId || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: result.payment._id,
          reference: result.reference,
          accessCode: result.accessCode,
          authorizationUrl: result.authorizationUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/payments/initiate]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message ?? "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
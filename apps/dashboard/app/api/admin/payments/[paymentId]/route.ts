// app/api/admin/payments/[paymentId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { AdminLog }                    from "@/models/admin-log";
import { Payment }                     from "@/models/payment";
import { Plan }                        from "@/models/plan";
import { Subscription }                from "@/models/subscription";
import { User }                        from "@/models/user";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  try {
    await connectDB();

    const payment = await Payment.findById(paymentId).lean();
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const [payer, plan, subscription, recentActions] = await Promise.all([
      User.findById(payment.userId).lean(),
      Plan.findById(payment.planId).lean(),
      payment.subscriptionId ? Subscription.findById(payment.subscriptionId).lean() : null,
      AdminLog.getActionsByTarget("payment", paymentId),
    ]);

    return NextResponse.json({
      payment: {
        id: String(payment._id),
        reference: payment.reference,
        paystackReference: payment.paystackReference ?? null,
        amount: payment.amount,
        amountPaid: payment.amountPaid,
        currency: payment.currency,
        gatewayStatus: payment.gatewayStatus,
        gatewayResponse: payment.gatewayResponse ?? null,
        channel: payment.channel ?? null,
        ipAddress: payment.ipAddress ?? null,
        cardType: payment.cardType ?? null,
        cardLast4: payment.cardLast4 ?? null,
        cardBank: payment.cardBank ?? null,
        paidAt: payment.paidAt ?? null,
        createdAt: payment.createdAt,
      },
      payer: payer ? { id: String(payer._id), name: payer.name, email: payer.email } : null,
      plan: plan ? { id: String(plan._id), name: plan.name, interval: plan.interval } : null,
      subscription: subscription ? {
        id: String(subscription._id), status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart, currentPeriodEnd: subscription.currentPeriodEnd,
      } : null,
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/payments/:paymentId] failed to load payment:", error);
    return NextResponse.json({ error: "Failed to load payment" }, { status: 500 });
  }
}

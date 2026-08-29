// app/api/admin/payments/[paymentId]/receipt/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Payment }                     from "@/models/payment";
import { Plan }                        from "@/models/plan";
import { User }                        from "@/models/user";
import { ReceiptDocument }             from "@/lib/pdf/receipt-document";
import { renderPdfResponse }           from "@/lib/pdf/render";

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

    const [payer, plan] = await Promise.all([
      User.findById(payment.userId).lean(),
      Plan.findById(payment.planId).lean(),
    ]);
    if (!payer) return NextResponse.json({ error: "Payer account no longer exists" }, { status: 404 });

    await logAdminAction(req, admin, {
      action: AdminAction.EXPORT_DATA,
      details: `exported PDF receipt for payment ${payment.reference}`,
      targetType: "payment",
      targetId: String(payment._id),
      targetName: payment.reference,
      reversible: true,
    });

    return renderPdfResponse(
      ReceiptDocument({
        payment: {
          reference: payment.reference,
          amount: payment.amount,
          amountPaid: payment.amountPaid,
          currency: payment.currency,
          gatewayStatus: payment.gatewayStatus,
          channel: payment.channel,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          cardType: payment.cardType,
          cardLast4: payment.cardLast4,
          cardBank: payment.cardBank,
        },
        payer: { name: payer.name, email: payer.email },
        plan: plan ? { name: plan.name, interval: plan.interval } : null,
      }),
      `receipt-${payment.reference}.pdf`
    );
  } catch (error) {
    console.error("[admin/payments/:paymentId/receipt] failed to generate receipt:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}

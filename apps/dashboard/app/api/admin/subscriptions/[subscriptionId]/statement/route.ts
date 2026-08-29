// app/api/admin/subscriptions/[subscriptionId]/statement/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Subscription }                from "@/models/subscription";
import { Plan }                        from "@/models/plan";
import { Payment }                     from "@/models/payment";
import { User }                        from "@/models/user";
import { SubscriptionStatementDocument } from "@/lib/pdf/subscription-statement-document";
import { renderPdfResponse }           from "@/lib/pdf/render";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriptionId } = await params;
  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  try {
    await connectDB();

    const subscription = await Subscription.findById(subscriptionId).lean();
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const [subscriber, plan, payments] = await Promise.all([
      User.findById(subscription.subscriberId).lean(),
      Plan.findById(subscription.planId).lean(),
      Payment.find({ subscriptionId: subscription._id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!subscriber) return NextResponse.json({ error: "Subscriber account no longer exists" }, { status: 404 });

    await logAdminAction(req, admin, {
      action: AdminAction.EXPORT_DATA,
      details: `exported PDF statement for a subscription`,
      targetType: "subscription",
      targetId: String(subscription._id),
      reversible: true,
    });

    return renderPdfResponse(
      SubscriptionStatementDocument({
        subscription: {
          id: String(subscription._id),
          status: subscription.status,
          interval: subscription.interval,
          priceAmount: subscription.priceAmount,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          autoRenew: subscription.autoRenew,
          createdAt: subscription.createdAt,
        },
        subscriber: { name: subscriber.name, email: subscriber.email },
        plan: plan ? { name: plan.name } : null,
        payments: payments.map((p) => ({
          reference: p.reference, amount: p.amount, currency: p.currency,
          gatewayStatus: p.gatewayStatus, paidAt: p.paidAt, createdAt: p.createdAt,
        })),
      }),
      `statement-${String(subscription._id)}.pdf`
    );
  } catch (error) {
    console.error("[admin/subscriptions/:subscriptionId/statement] failed to generate statement:", error);
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}

// app/api/admin/subscriptions/[subscriptionId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { Subscription }                from "@/models/subscription";
import { Plan }                        from "@/models/plan";
import { Payment }                     from "@/models/payment";
import { User }                        from "@/models/user";
import { Notification }                from "@/models/notification";

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

    const [subscriber, plan, payments, recentActions] = await Promise.all([
      User.findById(subscription.subscriberId).lean(),
      Plan.findById(subscription.planId).lean(),
      Payment.find({ subscriptionId: subscription._id }).sort({ createdAt: -1 }).lean(),
      AdminLog.getActionsByTarget("subscription", subscriptionId),
    ]);

    return NextResponse.json({
      subscription: {
        id: String(subscription._id),
        status: subscription.status,
        interval: subscription.interval,
        priceAmount: subscription.priceAmount,
        currency: subscription.currency,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt ?? null,
        cancelledAt: subscription.cancelledAt ?? null,
        autoRenew: subscription.autoRenew,
        statusHistory: subscription.statusHistory,
        createdAt: subscription.createdAt,
      },
      subscriber: subscriber ? { id: String(subscriber._id), name: subscriber.name, email: subscriber.email } : null,
      plan: plan ? { id: String(plan._id), name: plan.name, interval: plan.interval, priceAmount: plan.priceAmount } : null,
      payments: payments.map((p) => ({
        id: String(p._id), reference: p.reference, amount: p.amount, amountPaid: p.amountPaid,
        currency: p.currency, gatewayStatus: p.gatewayStatus, paidAt: p.paidAt, createdAt: p.createdAt,
      })),
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/subscriptions/:subscriptionId] failed to load subscription:", error);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}

/**
 * Admin-initiated cancellation — e.g. per subscriber request, fraud, or a
 * billing dispute. No permission flag is modeled for subscription management,
 * and cancelling a paid subscription is financially significant, so this is
 * hardcoded to admin/super_admin rather than left to baseline dashboard access.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isAnAdmin && !admin.isSuperAdmin) {
    return NextResponse.json({ error: "You do not have permission to manage subscriptions" }, { status: 403 });
  }

  const { subscriptionId } = await params;
  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  let body: { action?: "cancel"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "action must be 'cancel'" }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to cancel a subscription" }, { status: 400 });
  }

  try {
    await connectDB();

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    if (subscription.status === "cancelled") {
      return NextResponse.json({ error: "This subscription is already cancelled" }, { status: 400 });
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    subscription.statusHistory.push({ status: "cancelled", changedAt: new Date(), reason: body.reason.trim() });
    await subscription.save();

    await logAdminAction(req, admin, {
      action: AdminAction.CANCEL_SUBSCRIPTION,
      details: `cancelled subscription for subscriber`,
      targetType: "subscription",
      targetId: String(subscription._id),
      reason: body.reason,
      reversible: false,
    });

    await Notification.create({
      recipientId: subscription.subscriberId,
      type:        "subscription_cancelled",
      actorId:     new mongoose.Types.ObjectId(admin.id),
      message:     `Your subscription was cancelled by an admin: ${body.reason.trim()}`,
      entityType:  "subscription",
      entityId:    subscription._id,
    });

    return NextResponse.json({
      id: String(subscription._id),
      status: subscription.status,
      cancelledAt: subscription.cancelledAt,
    });
  } catch (error) {
    console.error("[admin/subscriptions/:subscriptionId] failed to update subscription:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

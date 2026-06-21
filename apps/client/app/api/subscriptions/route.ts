// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Subscription } from "@/models/subscription";
import { Plan } from "@/models/plan";
import { Payment } from "@/models/payment";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * Subscriptions API — Nomeo.
 *
 *   GET  /api/subscriptions   → the caller's active/trialing subscription (or null)
 *   POST /api/subscriptions   → activate a subscription after a verified payment
 *
 * Flow: the client pays via Paystack (payment initiated + verified separately),
 * then POSTs { planId, paystackReference } here. We confirm the payment is
 * SUCCESS, create the subscription, and link the payment to it.
 *
 * No coupons, no plan limits/tiers — Nomeo membership is flat platform access.
 */

const MONTHS_PER_INTERVAL: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannually: 6,
  yearly: 12,
};

function calcPeriodEnd(from: Date, interval: string): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + (MONTHS_PER_INTERVAL[interval] ?? 1));
  return d;
}

function serialize(sub: Record<string, unknown>, plan?: Record<string, unknown> | null) {
  const now = Date.now();
  const status = sub.status as string;
  const periodEnd = new Date(sub.currentPeriodEnd as Date);
  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt as Date) : null;

  const isActive =
    (status === "active" || status === "trialing") && periodEnd.getTime() >= now;
  const isInTrial = status === "trialing" && !!trialEndsAt && trialEndsAt.getTime() >= now;
  const daysUntilRenewal = Math.max(0, Math.ceil((periodEnd.getTime() - now) / 86_400_000));

  return {
    id: String(sub._id),
    status,
    interval: sub.interval,
    priceAmount: sub.priceAmount,
    priceFormatted: `₦${(((sub.priceAmount as number) ?? 0) / 100).toLocaleString("en-NG")}`,
    currency: sub.currency,
    currentPeriodStart: new Date(sub.currentPeriodStart as Date).toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    autoRenew: sub.autoRenew,
    cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt as Date).toISOString() : null,

    // top-level computed flags the hook reads directly
    isActive,
    isInTrial,
    daysUntilRenewal,

    plan: plan
      ? {
          id: String(plan._id),
          name: plan.name,
          interval: plan.interval,
          priceAmount: plan.priceAmount,
          currency: plan.currency,
          trialDays: plan.trialDays,
        }
      : null,

    createdAt: sub.createdAt ? new Date(sub.createdAt as Date).toISOString() : null,
    updatedAt: sub.updatedAt ? new Date(sub.updatedAt as Date).toISOString() : null,
  };
}

const ACTIVE_STATUSES = ["active", "trialing", "past_due", "paused"];

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const sub = await Subscription.findOne({
      subscriberId: new mongoose.Types.ObjectId(user.id),
      status: { $in: ACTIVE_STATUSES },
    }).lean();

    if (!sub) return NextResponse.json({ subscription: null });

    const plan = await Plan.findById((sub as Record<string, unknown>).planId).lean();
    return NextResponse.json({ subscription: serialize(sub as Record<string, unknown>, plan as Record<string, unknown> | null) });
  } catch (err) {
    console.error("[GET /api/subscriptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId, paystackReference } = await req.json();
    if (!planId || !paystackReference) {
      return NextResponse.json(
        { error: "planId and paystackReference are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // One active subscription per subscriber.
    const existing = await Subscription.findOne({
      subscriberId: new mongoose.Types.ObjectId(user.id),
      status: { $in: ACTIVE_STATUSES },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active subscription.", code: "ALREADY_SUBSCRIBED" },
        { status: 409 }
      );
    }

    const plan = await Plan.findOne({ _id: planId, status: "active" });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Confirm the payment succeeded and belongs to this user + plan.
    const payment = await Payment.findOne({ reference: paystackReference });
    if (!payment || payment.gatewayStatus !== "success") {
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }
    if (String(payment.userId) !== user.id || String(payment.planId) !== String(plan._id)) {
      return NextResponse.json({ error: "Payment does not match this subscription" }, { status: 400 });
    }

    const now = new Date();
    const hasTrial = plan.trialDays > 0;
    const trialEndsAt = hasTrial ? new Date(now.getTime() + plan.trialDays * 86_400_000) : undefined;
    const status = hasTrial ? "trialing" : "active";

    const subscription = await Subscription.create({
      subscriberId: new mongoose.Types.ObjectId(user.id),
      planId: plan._id,
      status,
      interval: plan.interval,
      priceAmount: plan.priceAmount,
      currency: plan.currency,
      externalSubscriptionId: undefined, // set if you use Paystack-managed plans
      currentPeriodStart: now,
      currentPeriodEnd: calcPeriodEnd(now, plan.interval),
      trialEndsAt,
      autoRenew: true,
      statusHistory: [{ status, changedAt: now, reason: "Initial subscription" }],
    });

    // Link the payment to the new subscription.
    await Payment.updateOne({ _id: payment._id }, { $set: { subscriptionId: subscription._id } });

    const full = await Subscription.findById(subscription._id).lean();
    return NextResponse.json(
      { subscription: serialize(full as Record<string, unknown>, plan.toObject()) },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/subscriptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
// app/api/admin/subscriptions/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Subscription }                from "@/models/subscription";
import { Notification }                from "@/models/notification";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BULK = 100;

/**
 * Bulk cancel — the only admin-initiated subscription action (see
 * PATCH /api/admin/subscriptions/[subscriptionId] for the single-item
 * version this mirrors). Same admin/super_admin gate: cancelling a paid
 * subscription is financially significant.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `subscriptions-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isAnAdmin && !admin.isSuperAdmin) {
    return NextResponse.json({ error: "You do not have permission to manage subscriptions" }, { status: 403 });
  }

  let body: { ids?: string[]; action?: "cancel"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} subscriptions at once` }, { status: 400 });

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "action must be 'cancel'" }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to cancel a subscription" }, { status: 400 });
  }
  const reason = body.reason.trim();

  try {
    await connectDB();

    const subscriptions = await Subscription.find({ _id: { $in: ids }, status: { $ne: "cancelled" } });
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "None of the selected subscriptions can be cancelled" }, { status: 400 });
    }

    const now = new Date();
    for (const subscription of subscriptions) {
      subscription.status = "cancelled";
      subscription.cancelledAt = now;
      subscription.autoRenew = false;
      subscription.statusHistory.push({ status: "cancelled", changedAt: now, reason });
    }

    await Promise.all(subscriptions.map((s) => s.save()));

    await Notification.insertMany(subscriptions.map((s) => ({
      recipientId: s.subscriberId,
      type:        "subscription_cancelled",
      actorId:     new mongoose.Types.ObjectId(admin.id),
      message:     `Your subscription was cancelled by an admin: ${reason}`,
      entityType:  "subscription",
      entityId:    s._id,
    })));

    await logAdminAction(req, admin, {
      action: AdminAction.CANCEL_SUBSCRIPTION,
      details: `bulk-cancelled ${subscriptions.length} subscription(s)`,
      targetType: "subscription",
      reason,
      reversible: false,
      affectedCount: subscriptions.length,
    });

    return NextResponse.json({ requested: ids.length, updated: subscriptions.length });
  } catch (error) {
    console.error("[admin/subscriptions/bulk] failed to process bulk cancel:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}

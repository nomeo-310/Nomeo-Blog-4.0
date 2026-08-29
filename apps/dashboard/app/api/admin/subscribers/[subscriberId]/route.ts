// app/api/admin/subscribers/[subscriberId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { NewsletterSubscriber }        from "@/models/newsletter";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subscriberId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriberId } = await params;
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: "Invalid subscriber id" }, { status: 400 });
  }

  try {
    await connectDB();

    const [subscriber, recentActions] = await Promise.all([
      NewsletterSubscriber.findById(subscriberId).lean(),
      AdminLog.getActionsByTarget("newsletter_subscriber", subscriberId),
    ]);
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });

    return NextResponse.json({
      subscriber: {
        id: String(subscriber._id),
        email: subscriber.email,
        name: subscriber.name ?? null,
        phone: subscriber.phone ?? null,
        userId: subscriber.userId ? String(subscriber.userId) : null,
        isConfirmed: subscriber.isConfirmed,
        confirmedAt: subscriber.confirmedAt ?? null,
        isUnsubscribed: subscriber.isUnsubscribed,
        unsubscribedAt: subscriber.unsubscribedAt ?? null,
        source: subscriber.source,
        createdAt: subscriber.createdAt,
      },
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/subscribers/:subscriberId] failed to load subscriber:", error);
    return NextResponse.json({ error: "Failed to load subscriber" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subscriberId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriberId } = await params;
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: "Invalid subscriber id" }, { status: 400 });
  }

  let body: { action?: "unsubscribe"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "unsubscribe") {
    return NextResponse.json({ error: "action must be 'unsubscribe'" }, { status: 400 });
  }

  try {
    await connectDB();

    const subscriber = await NewsletterSubscriber.findById(subscriberId);
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    if (subscriber.isUnsubscribed) {
      return NextResponse.json({ error: "This subscriber is already unsubscribed" }, { status: 400 });
    }

    subscriber.isUnsubscribed = true;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    await logAdminAction(req, admin, {
      action: AdminAction.UNSUBSCRIBE_SUBSCRIBER,
      details: `unsubscribed ${subscriber.email}`,
      targetType: "newsletter_subscriber",
      targetId: String(subscriber._id),
      targetName: subscriber.email,
      reason: body.reason,
      reversible: false,
    });

    return NextResponse.json({ id: String(subscriber._id), isUnsubscribed: true });
  } catch (error) {
    console.error("[admin/subscribers/:subscriberId] failed to update subscriber:", error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}

/** GDPR-style hard removal — no permission flag modeled, so hardcoded to super_admin like other PII hard-deletes. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ subscriberId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can delete a subscriber" }, { status: 403 });
  }

  const { subscriberId } = await params;
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: "Invalid subscriber id" }, { status: 400 });
  }

  let body: { reason?: string; confirmEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to delete a subscriber" }, { status: 400 });
  }

  try {
    await connectDB();

    const subscriber = await NewsletterSubscriber.findById(subscriberId);
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    if (body.confirmEmail !== subscriber.email) {
      return NextResponse.json({ error: "confirmEmail must match the subscriber's email to confirm deletion" }, { status: 400 });
    }

    const email = subscriber.email;
    await subscriber.deleteOne();

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_SUBSCRIBER,
      details: `deleted subscriber ${email}`,
      targetType: "newsletter_subscriber",
      targetId: subscriberId,
      targetName: email,
      reason: body.reason,
      reversible: false,
    });

    return NextResponse.json({ id: subscriberId, deleted: true });
  } catch (error) {
    console.error("[admin/subscribers/:subscriberId] failed to delete subscriber:", error);
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }
}

// app/api/admin/subscribers/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { NewsletterSubscriber }        from "@/models/newsletter";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BULK = 500;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `subscribers-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; action?: "unsubscribe" | "delete"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} at once` }, { status: 400 });
  if (body.action !== "unsubscribe" && body.action !== "delete") {
    return NextResponse.json({ error: "action must be 'unsubscribe' or 'delete'" }, { status: 400 });
  }
  if (body.action === "delete" && !admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can delete subscribers" }, { status: 403 });
  }
  if (body.action === "delete" && !body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to delete subscribers" }, { status: 400 });
  }

  try {
    await connectDB();

    if (body.action === "unsubscribe") {
      const result = await NewsletterSubscriber.updateMany(
        { _id: { $in: ids }, isUnsubscribed: false },
        { $set: { isUnsubscribed: true, unsubscribedAt: new Date() } }
      );

      await logAdminAction(req, admin, {
        action: AdminAction.UNSUBSCRIBE_SUBSCRIBER,
        details: `bulk-unsubscribed ${result.modifiedCount} subscriber(s)`,
        targetType: "newsletter_subscriber",
        reason: body.reason,
        reversible: false,
        affectedCount: result.modifiedCount,
      });

      return NextResponse.json({ requested: ids.length, updated: result.modifiedCount });
    }

    const result = await NewsletterSubscriber.deleteMany({ _id: { $in: ids } });

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_SUBSCRIBER,
      details: `bulk-deleted ${result.deletedCount} subscriber(s)`,
      targetType: "newsletter_subscriber",
      reason: body.reason,
      reversible: false,
      affectedCount: result.deletedCount,
    });

    return NextResponse.json({ requested: ids.length, deleted: result.deletedCount });
  } catch (error) {
    console.error("[admin/subscribers/bulk] failed to process bulk action:", error);
    return NextResponse.json({ error: "Failed to update subscribers" }, { status: 500 });
  }
}

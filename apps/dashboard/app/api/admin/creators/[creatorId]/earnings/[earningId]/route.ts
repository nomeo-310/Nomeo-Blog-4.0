// app/api/admin/creators/[creatorId]/earnings/[earningId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { CreatorEarning }              from "@/models/creator-earning";
import { Notification }                from "@/models/notification";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type PayoutAction = "hold" | "release" | "mark_paid";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ creatorId: string; earningId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canManagePayouts")) {
    return NextResponse.json({ error: "You do not have permission to manage payouts" }, { status: 403 });
  }

  const { creatorId, earningId } = await params;
  if (!mongoose.Types.ObjectId.isValid(creatorId) || !mongoose.Types.ObjectId.isValid(earningId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: PayoutAction; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, note } = body;
  if (!action || !["hold", "release", "mark_paid"].includes(action)) {
    return NextResponse.json({ error: "action must be one of hold, release, mark_paid" }, { status: 400 });
  }
  if (action === "hold" && !note?.trim()) {
    return NextResponse.json({ error: "A note is required to place a payout on hold" }, { status: 400 });
  }

  try {
    await connectDB();

    const earning = await CreatorEarning.findOne({ _id: earningId, creatorId });
    if (!earning) return NextResponse.json({ error: "Earning record not found" }, { status: 404 });

    let adminAction: AdminAction;

    switch (action) {
      case "hold":
        if (earning.payoutStatus === "paid") {
          return NextResponse.json({ error: "A paid earning cannot be placed on hold" }, { status: 400 });
        }
        earning.payoutStatus = "on_hold";
        earning.adminNotes = note!.trim();
        adminAction = AdminAction.HOLD_CREATOR_PAYOUT;
        break;
      case "release":
        if (earning.payoutStatus !== "on_hold") {
          return NextResponse.json({ error: "Only a held payout can be released" }, { status: 400 });
        }
        earning.payoutStatus = "calculated";
        adminAction = AdminAction.RELEASE_CREATOR_PAYOUT;
        break;
      case "mark_paid":
        if (earning.payoutStatus !== "calculated" && earning.payoutStatus !== "processing") {
          return NextResponse.json({ error: "Only a calculated or processing payout can be marked paid" }, { status: 400 });
        }
        earning.payoutStatus = "paid";
        earning.payoutCompletedAt = new Date();
        adminAction = AdminAction.MARK_PAYOUT_PAID;
        break;
    }

    await earning.save();

    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} payout for creator earning ${earning.billingPeriod}`,
      targetType: "earning",
      targetId: String(earning._id),
      reason: note,
      reversible: action !== "mark_paid",
    });

    if (action === "mark_paid") {
      await Notification.create({
        recipientId: earning.creatorId,
        type:        "payout_processed",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     `Your ${earning.billingPeriod} earnings of ${earning.netAmount} ${earning.currency} have been paid out.`,
        entityType:  "earning",
        entityId:    earning._id,
      });
    }

    return NextResponse.json({
      id: String(earning._id),
      payoutStatus: earning.payoutStatus,
      payoutCompletedAt: earning.payoutCompletedAt ?? null,
    });
  } catch (error) {
    console.error("[admin/creators/:creatorId/earnings/:earningId] failed to update payout:", error);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}

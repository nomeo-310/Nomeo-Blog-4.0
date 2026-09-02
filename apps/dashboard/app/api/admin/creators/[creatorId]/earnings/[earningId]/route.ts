// app/api/admin/creators/[creatorId]/earnings/[earningId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { CreatorEarning }              from "@/models/creator-earning";
import { Notification }                from "@/models/notification";
import { Profile }                     from "@/models/profile";
import { paystack }                    from "@/lib/paystack";
import type { IAdminPermissions }      from "@/models/admin";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type PayoutAction = "hold" | "release" | "mark_paid";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ creatorId: string; earningId: string }> }
) {
  // mark_paid initiates a real Paystack transfer — keep this tight.
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `creator-payout-action:${ip}`, limit: 10, windowSeconds: 60 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

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
        if (earning.payoutStatus === "processing") {
          // A transfer is already in flight — the Paystack transfer webhook
          // will move this to "paid" or "failed" on its own and would just
          // overwrite an "on_hold" status the moment it lands, so holding
          // here wouldn't actually stop anything. Wait for it to resolve.
          return NextResponse.json({ error: "A payout that's already processing can't be held — wait for the transfer to complete or fail" }, { status: 400 });
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
      case "mark_paid": {
        if (earning.payoutStatus === "processing") {
          // A transfer is already in flight for this earning — don't fire a
          // second one, just report where it stands. It resolves to "paid"
          // (or "failed") via the Paystack transfer webhook, not here.
          return NextResponse.json({
            id: String(earning._id),
            payoutStatus: earning.payoutStatus,
            payoutTransferId: earning.payoutTransferId ?? null,
            payoutCompletedAt: earning.payoutCompletedAt ?? null,
          });
        }
        if (earning.payoutStatus !== "calculated") {
          return NextResponse.json({ error: "Only a calculated payout can be marked paid" }, { status: 400 });
        }
        if (!earning.payoutRequestedAt) {
          return NextResponse.json({ error: "This payout has not been requested by the creator yet" }, { status: 400 });
        }

        const creatorProfile = await Profile.findOne({ userId: earning.creatorId });
        const recipientCode = creatorProfile?.payoutDetails?.recipientCode;
        if (!recipientCode) {
          return NextResponse.json({ error: "This creator has not set up verified payout details" }, { status: 400 });
        }

        let transfer;
        try {
          transfer = await paystack.initiateTransfer({
            amount: earning.netAmount,
            recipient: recipientCode,
            reference: `payout_${earning._id}`,
            reason: `Nomeo earnings payout — ${earning.billingPeriod}`,
          });
        } catch (transferError) {
          console.error("[admin/creators/:creatorId/earnings/:earningId] Paystack transfer failed:", transferError);
          return NextResponse.json({
            error: transferError instanceof Error ? transferError.message : "Failed to initiate transfer",
          }, { status: 502 });
        }

        earning.payoutStatus = "processing";
        earning.payoutTransferId = transfer.transfer_code;
        earning.payoutInitiatedAt = new Date();
        adminAction = AdminAction.MARK_PAYOUT_PAID;
        break;
      }
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

    const NOTIFICATION: Record<PayoutAction, { type: "payout_processed" | "payout_on_hold" | "payout_released"; message: string }> = {
      hold: {
        type: "payout_on_hold",
        message: `Your ${earning.billingPeriod} payout has been placed on hold${note ? `: ${note.trim()}` : "."}`,
      },
      release: {
        type: "payout_released",
        message: `The hold on your ${earning.billingPeriod} payout has been released — it's processing again.`,
      },
      mark_paid: {
        type: "payout_processed",
        message: `Your ${earning.billingPeriod} payout of ${earning.netAmount} ${earning.currency} is being transferred to your bank account.`,
      },
    };
    await Notification.create({
      recipientId: earning.creatorId,
      type:        NOTIFICATION[action].type,
      actorId:     new mongoose.Types.ObjectId(admin.id),
      message:     NOTIFICATION[action].message,
      entityType:  "earning",
      entityId:    earning._id,
    });

    return NextResponse.json({
      id: String(earning._id),
      payoutStatus: earning.payoutStatus,
      payoutTransferId: earning.payoutTransferId ?? null,
      payoutCompletedAt: earning.payoutCompletedAt ?? null,
    });
  } catch (error) {
    console.error("[admin/creators/:creatorId/earnings/:earningId] failed to update payout:", error);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}

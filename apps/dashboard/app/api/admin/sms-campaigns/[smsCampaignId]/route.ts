// app/api/admin/sms-campaigns/[smsCampaignId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { SmsCampaign, SmsCampaignStatus, SmsAudience, SmsStatus } from "@/models/sms-campaign";
import { SmsLog }                      from "@/models/sms-log";
import { NewsletterSubscriber }        from "@/models/newsletter";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ smsCampaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { smsCampaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(smsCampaignId)) {
    return NextResponse.json({ error: "Invalid SMS campaign id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const campaign = await SmsCampaign.findById(smsCampaignId).lean();
    if (!campaign) return NextResponse.json({ error: "SMS campaign not found" }, { status: 404 });

    const [creator, recentLogs] = await Promise.all([
      db.collection("user").findOne({ _id: campaign.createdBy }, { projection: { name: 1, email: 1 } }),
      SmsLog.find({ campaignId: campaign._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      campaign: {
        id: String(campaign._id),
        title: campaign.title,
        message: campaign.message,
        audience: campaign.audience,
        status: campaign.status,
        externalRecipients: campaign.externalRecipients ?? [],
        recipients: campaign.recipients,
        sentAt: campaign.sentAt ?? null,
        createdBy: creator ? { id: String(campaign.createdBy), name: creator.name as string, email: creator.email as string } : null,
        createdAt: campaign.createdAt,
      },
      recentLogs: recentLogs.map((l) => ({
        id: String(l._id), phone: l.phone, name: l.name ?? null, recipientType: l.recipientType,
        status: l.status, sentAt: l.sentAt ?? null, error: l.error ?? null,
      })),
    });
  } catch (error) {
    console.error("[admin/sms-campaigns/:smsCampaignId] failed to load SMS campaign:", error);
    return NextResponse.json({ error: "Failed to load SMS campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ smsCampaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { smsCampaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(smsCampaignId)) {
    return NextResponse.json({ error: "Invalid SMS campaign id" }, { status: 400 });
  }

  let body: {
    action?: "update" | "send" | "cancel";
    title?: string;
    message?: string;
    audience?: SmsAudience;
    externalRecipients?: Array<{ phone: string; name?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !["update", "send", "cancel"].includes(body.action)) {
    return NextResponse.json({ error: "action must be one of update, send, cancel" }, { status: 400 });
  }
  const requiredFlag = body.action === "send" ? "canSendCampaign" : "canCreateCampaign";
  if (!hasPermission(admin, requiredFlag)) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const campaign = await SmsCampaign.findById(smsCampaignId);
    if (!campaign) return NextResponse.json({ error: "SMS campaign not found" }, { status: 404 });

    if (body.action === "update") {
      if (campaign.status !== SmsCampaignStatus.DRAFT) {
        return NextResponse.json({ error: "Only a draft SMS campaign can be edited" }, { status: 400 });
      }
      if (body.title !== undefined) campaign.title = body.title.trim();
      if (body.message !== undefined) campaign.message = body.message.trim();
      if (body.audience !== undefined) campaign.audience = body.audience;
      if (body.externalRecipients !== undefined) {
        campaign.externalRecipients = body.externalRecipients.filter((r) => r.phone?.trim());
      }
      await campaign.save();

      await logAdminAction(req, admin, {
        action: AdminAction.UPDATE_SMS_CAMPAIGN,
        details: `updated SMS campaign "${campaign.title}"`,
        targetType: "sms_campaign",
        targetId: String(campaign._id),
        targetName: campaign.title,
        reversible: true,
      });

      return NextResponse.json({ id: String(campaign._id), status: campaign.status });
    }

    if (body.action === "cancel") {
      if (campaign.status !== SmsCampaignStatus.DRAFT && campaign.status !== SmsCampaignStatus.SENDING) {
        return NextResponse.json({ error: "Only a draft or in-progress SMS campaign can be cancelled" }, { status: 400 });
      }
      campaign.status = SmsCampaignStatus.CANCELLED;
      await campaign.save();

      await logAdminAction(req, admin, {
        action: AdminAction.CANCEL_SMS_CAMPAIGN,
        details: `cancelled SMS campaign "${campaign.title}"`,
        targetType: "sms_campaign",
        targetId: String(campaign._id),
        targetName: campaign.title,
        reversible: false,
      });

      return NextResponse.json({ id: String(campaign._id), status: campaign.status });
    }

    // action === "send"
    if (campaign.status !== SmsCampaignStatus.DRAFT) {
      return NextResponse.json({ error: "Only a draft SMS campaign can be sent" }, { status: 400 });
    }

    const includeSubscribers = campaign.audience === SmsAudience.SUBSCRIBERS || campaign.audience === SmsAudience.BOTH;
    const includeExternal    = campaign.audience === SmsAudience.EXTERNAL || campaign.audience === SmsAudience.BOTH;

    const subscribers = includeSubscribers
      ? await NewsletterSubscriber.find({ phone: { $exists: true, $ne: null }, isUnsubscribed: false }).lean()
      : [];
    const externalRecipients = includeExternal ? (campaign.externalRecipients ?? []) : [];
    const totalRecipients = subscribers.length + externalRecipients.length;

    if (totalRecipients === 0) {
      return NextResponse.json({ error: "No recipients match this campaign's audience — nothing to send" }, { status: 400 });
    }

    campaign.status = SmsCampaignStatus.SENDING;
    campaign.sentAt = new Date();
    campaign.recipients.total = totalRecipients;
    await campaign.save();

    // Enqueue only — the actual sends happen in small batches via the
    // /api/cron/process-sms-campaign-queue worker (see vercel.json).
    await SmsLog.insertMany([
      ...subscribers.map((s) => ({
        campaignId: campaign._id, subscriberId: s._id, phone: s.phone!, name: s.name,
        recipientType: "subscriber" as const, status: SmsStatus.PENDING,
      })),
      ...externalRecipients.map((r: { phone: string; name?: string }) => ({
        campaignId: campaign._id, subscriberId: null, phone: r.phone, name: r.name,
        recipientType: "external" as const, status: SmsStatus.PENDING,
      })),
    ]);

    await logAdminAction(req, admin, {
      action: AdminAction.SEND_SMS_CAMPAIGN,
      details: `queued SMS campaign "${campaign.title}" for ${totalRecipients} recipient(s)`,
      targetType: "sms_campaign",
      targetId: String(campaign._id),
      targetName: campaign.title,
      reversible: false,
      affectedCount: totalRecipients,
    });

    return NextResponse.json({
      id: String(campaign._id),
      status: campaign.status,
      recipients: campaign.recipients,
      message: "SMS campaign queued — recipients will be texted by the background worker.",
    });
  } catch (error) {
    console.error("[admin/sms-campaigns/:smsCampaignId] failed to update SMS campaign:", error);
    return NextResponse.json({ error: "Failed to update SMS campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ smsCampaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canCreateCampaign")) {
    return NextResponse.json({ error: "You do not have permission to delete an SMS campaign" }, { status: 403 });
  }

  const { smsCampaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(smsCampaignId)) {
    return NextResponse.json({ error: "Invalid SMS campaign id" }, { status: 400 });
  }

  try {
    await connectDB();

    const campaign = await SmsCampaign.findById(smsCampaignId);
    if (!campaign) return NextResponse.json({ error: "SMS campaign not found" }, { status: 404 });
    if (campaign.status !== SmsCampaignStatus.DRAFT) {
      return NextResponse.json({ error: "Only a draft SMS campaign can be deleted" }, { status: 400 });
    }

    const title = campaign.title;
    await campaign.deleteOne();

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_SMS_CAMPAIGN,
      details: `deleted draft SMS campaign "${title}"`,
      targetType: "sms_campaign",
      targetId: smsCampaignId,
      targetName: title,
      reversible: false,
    });

    return NextResponse.json({ id: smsCampaignId, deleted: true });
  } catch (error) {
    console.error("[admin/sms-campaigns/:smsCampaignId] failed to delete SMS campaign:", error);
    return NextResponse.json({ error: "Failed to delete SMS campaign" }, { status: 500 });
  }
}

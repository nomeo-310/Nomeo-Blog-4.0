// app/api/admin/campaigns/[campaignId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Campaign, CampaignStatus, EmailStatus, CampaignType } from "@/models/campaign";
import { EmailLog }                    from "@/models/email-log";
import { NewsletterSubscriber }        from "@/models/newsletter";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const [creator, recentLogs] = await Promise.all([
      db.collection("user").findOne({ _id: campaign.createdBy }, { projection: { name: 1, email: 1 } }),
      EmailLog.find({ campaignId: campaign._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      campaign: {
        id: String(campaign._id),
        title: campaign.title,
        subject: campaign.subject,
        content: campaign.content,
        type: campaign.type,
        status: campaign.status,
        filters: campaign.filters ?? null,
        externalRecipients: campaign.externalRecipients ?? [],
        hasExternalRecipients: campaign.hasExternalRecipients,
        recipients: campaign.recipients,
        scheduledFor: campaign.scheduledFor ?? null,
        sentAt: campaign.sentAt ?? null,
        createdBy: creator ? { id: String(campaign.createdBy), name: creator.name as string, email: creator.email as string } : null,
        createdAt: campaign.createdAt,
      },
      recentLogs: recentLogs.map((l) => ({
        id: String(l._id), email: l.email, name: l.name ?? null, recipientType: l.recipientType,
        status: l.status, sentAt: l.sentAt ?? null, error: l.error ?? null,
      })),
    });
  } catch (error) {
    console.error("[admin/campaigns/:campaignId] failed to load campaign:", error);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  let body: {
    action?: "update" | "send" | "cancel";
    title?: string;
    subject?: string;
    content?: string;
    type?: CampaignType;
    filters?: { status?: string[]; subscribedAfter?: string };
    externalRecipients?: Array<{ email: string; name?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !["update", "send", "cancel"].includes(body.action)) {
    return NextResponse.json({ error: "action must be one of update, send, cancel" }, { status: 400 });
  }
  if ((body.action === "update" || body.action === "send") && !hasPermission(admin, body.action === "send" ? "canSendCampaign" : "canCreateCampaign")) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }
  if (body.action === "cancel" && !hasPermission(admin, "canSendCampaign")) {
    return NextResponse.json({ error: "You do not have permission to cancel a campaign" }, { status: 403 });
  }

  try {
    await connectDB();

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    if (body.action === "update") {
      if (campaign.status !== CampaignStatus.DRAFT) {
        return NextResponse.json({ error: "Only a draft campaign can be edited" }, { status: 400 });
      }
      if (body.title !== undefined) campaign.title = body.title.trim();
      if (body.subject !== undefined) campaign.subject = body.subject.trim();
      if (body.content !== undefined) campaign.content = body.content.trim();
      if (body.type !== undefined) campaign.type = body.type;
      if (body.filters !== undefined) {
        campaign.filters = {
          status: body.filters.status,
          subscribedAfter: body.filters.subscribedAfter ? new Date(body.filters.subscribedAfter) : undefined,
        };
      }
      if (body.externalRecipients !== undefined) {
        const externalRecipients = body.externalRecipients.filter((r) => /^\S+@\S+\.\S+$/.test(r.email));
        campaign.externalRecipients = externalRecipients;
        campaign.hasExternalRecipients = externalRecipients.length > 0;
      }
      await campaign.save();

      await logAdminAction(req, admin, {
        action: AdminAction.UPDATE_CAMPAIGN,
        details: `updated campaign "${campaign.title}"`,
        targetType: "campaign",
        targetId: String(campaign._id),
        targetName: campaign.title,
        reversible: true,
      });

      return NextResponse.json({ id: String(campaign._id), status: campaign.status });
    }

    if (body.action === "cancel") {
      if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SENDING) {
        return NextResponse.json({ error: "Only a draft or in-progress campaign can be cancelled" }, { status: 400 });
      }
      campaign.status = CampaignStatus.CANCELLED;
      await campaign.save();

      await logAdminAction(req, admin, {
        action: AdminAction.CANCEL_CAMPAIGN,
        details: `cancelled campaign "${campaign.title}"`,
        targetType: "campaign",
        targetId: String(campaign._id),
        targetName: campaign.title,
        reversible: false,
      });

      return NextResponse.json({ id: String(campaign._id), status: campaign.status });
    }

    // action === "send"
    if (campaign.status !== CampaignStatus.DRAFT) {
      return NextResponse.json({ error: "Only a draft campaign can be sent" }, { status: 400 });
    }

    const subscriberMatch: Record<string, unknown> = { isConfirmed: true, isUnsubscribed: false };
    if (campaign.filters?.subscribedAfter) subscriberMatch.createdAt = { $gte: campaign.filters.subscribedAfter };
    const subscribers = await NewsletterSubscriber.find(subscriberMatch).lean();

    const externalRecipients = campaign.externalRecipients ?? [];
    const totalRecipients = subscribers.length + externalRecipients.length;

    if (totalRecipients === 0) {
      return NextResponse.json({ error: "No recipients match this campaign — nothing to send" }, { status: 400 });
    }

    campaign.status = CampaignStatus.SENDING;
    campaign.sentAt = new Date();
    campaign.recipients.total = totalRecipients;
    campaign.recipientIds = subscribers.map((s) => s._id);
    await campaign.save();

    // Enqueue only — the actual sends happen in small batches via the
    // /api/cron/process-email-campaign-queue worker, which runs on a
    // schedule (see vercel.json) so this request returns immediately
    // regardless of list size.
    await EmailLog.insertMany([
      ...subscribers.map((s) => ({
        campaignId: campaign._id, newsletterId: s._id, email: s.email, name: s.name,
        recipientType: "subscriber" as const, status: EmailStatus.PENDING,
      })),
      ...externalRecipients.map((r: { email: string; name?: string }) => ({
        campaignId: campaign._id, newsletterId: null, email: r.email, name: r.name,
        recipientType: "external" as const, status: EmailStatus.PENDING,
      })),
    ]);

    await logAdminAction(req, admin, {
      action: AdminAction.SEND_CAMPAIGN,
      details: `queued campaign "${campaign.title}" for ${totalRecipients} recipient(s)`,
      targetType: "campaign",
      targetId: String(campaign._id),
      targetName: campaign.title,
      reversible: false,
      affectedCount: totalRecipients,
    });

    return NextResponse.json({
      id: String(campaign._id),
      status: campaign.status,
      recipients: campaign.recipients,
      message: "Campaign queued — recipients will be emailed by the background worker.",
    });
  } catch (error) {
    console.error("[admin/campaigns/:campaignId] failed to update campaign:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canCreateCampaign")) {
    return NextResponse.json({ error: "You do not have permission to delete a campaign" }, { status: 403 });
  }

  const { campaignId } = await params;
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  try {
    await connectDB();

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== CampaignStatus.DRAFT) {
      return NextResponse.json({ error: "Only a draft campaign can be deleted" }, { status: 400 });
    }

    const title = campaign.title;
    await campaign.deleteOne();

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_CAMPAIGN,
      details: `deleted draft campaign "${title}"`,
      targetType: "campaign",
      targetId: campaignId,
      targetName: title,
      reversible: false,
    });

    return NextResponse.json({ id: campaignId, deleted: true });
  } catch (error) {
    console.error("[admin/campaigns/:campaignId] failed to delete campaign:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}

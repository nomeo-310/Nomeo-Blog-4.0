// app/api/cron/process-email-campaign-queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB }    from "@/lib/connect-to-database";
import { Campaign, CampaignStatus, EmailStatus } from "@/models/campaign";
import { EmailLog }     from "@/models/email-log";
import { NewsletterSubscriber } from "@/models/newsletter";
import { mailService }  from "@/lib/mail-service";

// Vercel cron routes must re-run their logic on every invocation, not serve
// a cached response.
export const dynamic = "force-dynamic";

// Give the job enough time to work through a batch of sends.
export const maxDuration = 60;

/**
 * Drains the campaign email queue in small batches — this is the actual send
 * step. POST /api/admin/campaigns/[id] (action: "send") only creates "pending"
 * EmailLog rows and marks the campaign "sending"; this route is what turns
 * those into real emails, on a schedule (see vercel.json).
 *
 * No BullMQ/Redis here — there's no queue infra provisioned for this project,
 * so this uses the database itself as the queue (EmailLog.status: "pending")
 * and a cron-triggered worker to drain it in batches. Simple, and sufficient
 * for this platform's current volume; swap in a real queue if that changes.
 */
const BATCH_SIZE = 25;

export async function GET(req: NextRequest) {
  // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when it
  // invokes this route. Set CRON_SECRET in your Vercel project's env vars.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const pending = await EmailLog.find({ status: EmailStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE);

    const clientAppUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "";
    const touchedCampaignIds = new Set<string>();
    let sent = 0;
    let failed = 0;

    for (const log of pending) {
      touchedCampaignIds.add(String(log.campaignId));

      const campaign = await Campaign.findById(log.campaignId);
      if (!campaign || campaign.status === CampaignStatus.CANCELLED) {
        log.status = EmailStatus.FAILED;
        log.error = "Campaign is no longer active";
        await log.save();
        failed += 1;
        continue;
      }

      let unsubscribeUrl = `${clientAppUrl}/contact`;
      if (log.newsletterId) {
        const subscriber = await NewsletterSubscriber.findById(log.newsletterId).select("unsubscribeToken").lean();
        if (subscriber) {
          unsubscribeUrl = `${clientAppUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
        }
      }

      try {
        await mailService.sendCampaign({
          to: log.email,
          subject: campaign.subject,
          heading: campaign.title,
          bodyHtml: campaign.content,
          unsubscribeUrl,
          subscriberName: log.name,
        });
        log.status = EmailStatus.SENT;
        log.sentAt = new Date();
        sent += 1;
      } catch (error) {
        log.status = EmailStatus.FAILED;
        log.error = error instanceof Error ? error.message : "Unknown send error";
        failed += 1;
      }
      await log.save();
    }

    // Close out any touched campaign that has no pending sends left.
    for (const campaignId of touchedCampaignIds) {
      const stillPending = await EmailLog.countDocuments({ campaignId, status: EmailStatus.PENDING });
      if (stillPending > 0) continue;

      const [successCount, failCount] = await Promise.all([
        EmailLog.countDocuments({ campaignId, status: EmailStatus.SENT }),
        EmailLog.countDocuments({ campaignId, status: EmailStatus.FAILED }),
      ]);
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: {
          status: successCount > 0 ? CampaignStatus.COMPLETED : CampaignStatus.FAILED,
          "recipients.successful": successCount,
          "recipients.failed": failCount,
        },
      });
    }

    const remaining = await EmailLog.countDocuments({ status: EmailStatus.PENDING });

    return NextResponse.json({ ok: true, processed: pending.length, sent, failed, remaining });
  } catch (error) {
    console.error("[cron/process-email-campaign-queue] failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

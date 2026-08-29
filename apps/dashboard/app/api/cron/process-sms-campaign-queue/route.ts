// app/api/cron/process-sms-campaign-queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB }    from "@/lib/connect-to-database";
import { SmsCampaign, SmsCampaignStatus, SmsStatus } from "@/models/sms-campaign";
import { SmsLog }       from "@/models/sms-log";
import { smsService }   from "@/lib/sms-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mirrors process-email-campaign-queue — see that route for the design rationale. */
const BATCH_SIZE = 25;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const pending = await SmsLog.find({ status: SmsStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE);

    const touchedCampaignIds = new Set<string>();
    let sent = 0;
    let failed = 0;

    for (const log of pending) {
      touchedCampaignIds.add(String(log.campaignId));

      const campaign = await SmsCampaign.findById(log.campaignId);
      if (!campaign || campaign.status === SmsCampaignStatus.CANCELLED) {
        log.status = SmsStatus.FAILED;
        log.error = "Campaign is no longer active";
        await log.save();
        failed += 1;
        continue;
      }

      const result = await smsService.send(log.phone, campaign.message);
      if (result.success) {
        log.status = SmsStatus.SENT;
        log.sentAt = new Date();
        log.providerMessageId = result.messageId;
        sent += 1;
      } else {
        log.status = SmsStatus.FAILED;
        log.error = result.error;
        failed += 1;
      }
      await log.save();
    }

    for (const campaignId of touchedCampaignIds) {
      const stillPending = await SmsLog.countDocuments({ campaignId, status: SmsStatus.PENDING });
      if (stillPending > 0) continue;

      const [successCount, failCount] = await Promise.all([
        SmsLog.countDocuments({ campaignId, status: SmsStatus.SENT }),
        SmsLog.countDocuments({ campaignId, status: SmsStatus.FAILED }),
      ]);
      await SmsCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          status: successCount > 0 ? SmsCampaignStatus.COMPLETED : SmsCampaignStatus.FAILED,
          "recipients.successful": successCount,
          "recipients.failed": failCount,
        },
      });
    }

    const remaining = await SmsLog.countDocuments({ status: SmsStatus.PENDING });

    return NextResponse.json({ ok: true, processed: pending.length, sent, failed, remaining });
  } catch (error) {
    console.error("[cron/process-sms-campaign-queue] failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

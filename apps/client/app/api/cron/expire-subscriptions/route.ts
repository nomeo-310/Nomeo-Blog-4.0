import { NextRequest, NextResponse } from "next/server";
import { Subscription } from "@/models/subscription";
import { connectDB } from "@/lib/connect-to-database";

// Prevent this route from being statically cached — Vercel cron routes must
// re-run their logic on every invocation, not serve a cached response.
export const dynamic = "force-dynamic";

// Give the job enough time to run a few updateMany calls. 60s is generous
// for this workload; raise if your subscriber count is very large.
export const maxDuration = 60;

/**
 * Grace window for subscriptions that are "active" with autoRenew = true.
 * These are expected to renew via your payment webhook (Stripe/Paystack)
 * around currentPeriodEnd. We don't expire them the instant the period
 * ends — we give the webhook a buffer to land first. If the period end is
 * still in the past after this buffer, we treat the renewal as failed/missed
 * and expire as a safety net.
 */
const RENEWAL_GRACE_PERIOD_HOURS = 24;

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

    const now = new Date();
    const graceCutoff = new Date(
      now.getTime() - RENEWAL_GRACE_PERIOD_HOURS * 60 * 60 * 1000
    );

    // --- Case 1: statuses with no renewal expected ---------------------
    // cancelled  -> access was promised only until currentPeriodEnd
    // past_due   -> grace period (already encoded by this status) is over
    // paused     -> doesn't auto-renew
    // trialing   -> trial lapsed without converting to a paid period
    const noRenewalExpected = await Subscription.updateMany(
      {
        currentPeriodEnd: { $lt: now },
        status: { $in: ["cancelled", "past_due", "paused", "trialing"] },
      },
      {
        $set: { status: "expired" },
        $push: {
          statusHistory: {
            status: "expired",
            changedAt: now,
            reason: "Subscription period ended",
          },
        },
      }
    );

    // --- Case 2: active, but subscriber turned auto-renew off ----------
    const autoRenewOff = await Subscription.updateMany(
      {
        currentPeriodEnd: { $lt: now },
        status: "active",
        autoRenew: false,
      },
      {
        $set: { status: "expired" },
        $push: {
          statusHistory: {
            status: "expired",
            changedAt: now,
            reason: "Subscription period ended, auto-renew was off",
          },
        },
      }
    );

    // --- Case 3: active, auto-renew on, but renewal never landed -------
    // Safety net only — normally your payment webhook moves these to
    // "past_due" or renews them before this fires.
    const failedRenewal = await Subscription.updateMany(
      {
        currentPeriodEnd: { $lt: graceCutoff },
        status: "active",
        autoRenew: true,
      },
      {
        $set: { status: "expired" },
        $push: {
          statusHistory: {
            status: "expired",
            changedAt: now,
            reason: `Auto-renew did not complete within ${RENEWAL_GRACE_PERIOD_HOURS}h grace period`,
          },
        },
      }
    );

    const summary = {
      noRenewalExpected: noRenewalExpected.modifiedCount,
      autoRenewOff: autoRenewOff.modifiedCount,
      failedRenewal: failedRenewal.modifiedCount,
      total:
        noRenewalExpected.modifiedCount +
        autoRenewOff.modifiedCount +
        failedRenewal.modifiedCount,
    };

    console.log("[api/cron/expire-subscriptions]", summary);

    return NextResponse.json({
      ok: true,
      ranAt: now.toISOString(),
      expired: summary,
    });
  } catch (err) {
    console.error("[cron/expire-subscriptions] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
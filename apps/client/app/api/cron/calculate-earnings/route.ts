import { NextRequest, NextResponse } from "next/server";
import { calculateEarningsForPeriod, previousBillingPeriod } from "@/services/earnings-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs the creator earnings calculation for the most recently CLOSED
 * billing period (last calendar month — the current month is still
 * accumulating reads). Intended to run once, early in the month, via a
 * scheduled cron (Vercel Cron or similar) hitting this with
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * Safe to re-run: calculateEarningsForPeriod upserts, so a retry after a
 * partial failure just recomputes the same numbers rather than duplicating.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const billingPeriod = req.nextUrl.searchParams.get("billingPeriod") ?? previousBillingPeriod();
    const result = await calculateEarningsForPeriod(billingPeriod);

    console.log("[api/cron/calculate-earnings]", result);

    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), result });
  } catch (err) {
    console.error("[cron/calculate-earnings] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

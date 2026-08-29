// scripts/backfill-earnings.ts
//
// One-time backfill for paid-post reads that happened BEFORE this earnings
// system existed. It does two things, in order, for every past (closed)
// billing period:
//
//   1. Credits historical reads as "completed". PostRead rows created
//      before the reading-progress tracker shipped all have
//      completedRead: false and readDurationSeconds: 0 (nothing ever set
//      them) — so under the fixed_rate model those reads would otherwise
//      earn writers nothing, even though the reads genuinely happened. This
//      marks every such subscriber read as completed, once.
//
//   2. Runs the real calculateEarningsForPeriod() — the exact same
//      function the monthly cron uses — for every past period that has
//      subscriber reads. Safe to re-run: it upserts, and never reopens a
//      payout that's already processing or paid.
//
// IMPORTANT — this only helps under the "fixed_rate" payout model. Under
// "pool_share", a creator's share depends on readDurationSeconds (weighted
// read-minutes), which was never tracked for historical reads either and
// can't be reconstructed — crediting completedRead alone does nothing for
// that model's math. The script warns if pool_share is active.
//
// The CURRENT (still-open) billing period is deliberately left alone —
// it's accumulating real, live-tracked reads now and shouldn't be
// calculated early.
//
// Usage:
//   npx tsx scripts/backfill-earnings.ts preview   # no writes — just reports what would happen
//   npx tsx scripts/backfill-earnings.ts run       # applies the backfill and calculates earnings
//
// Run "preview" first.

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/connect-to-database";
import { PostRead } from "../models/post-read";
import { getPlatformSettings } from "../models/platform-settings";
import { calculateEarningsForPeriod } from "../services/earnings-service";

function currentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function findPastPeriods(cutoff: string): Promise<string[]> {
  const periods = (await PostRead.distinct("billingPeriod", {
    billingPeriod: { $lt: cutoff },
    readerIsSubscriber: true,
  })) as string[];
  return periods.sort();
}

async function warnIfPoolShare() {
  const settings = await getPlatformSettings();
  if (settings.payoutModel !== "fixed_rate") {
    console.log(
      `\n⚠  PlatformSettings.payoutModel is "${settings.payoutModel}", not "fixed_rate".\n` +
      `   This backfill only credits completedRead — it has no effect on pool_share\n` +
      `   payouts, which need read-duration data that was never tracked for these\n` +
      `   historical reads. Switch to fixed_rate in the admin Settings page first\n` +
      `   if you want these old reads to actually earn anything.\n`
    );
  }
}

async function preview() {
  await connectDB();
  await warnIfPoolShare();

  const cutoff = currentBillingPeriod();
  const staleReads = await PostRead.countDocuments({
    billingPeriod: { $lt: cutoff },
    readerIsSubscriber: true,
    completedRead: false,
  });
  const periods = await findPastPeriods(cutoff);

  console.log(`Backfill preview (current period ${cutoff} is left alone — still accumulating)\n`);
  console.log(`  Historical subscriber reads that would be credited as completed: ${staleReads}`);
  console.log(`  Past billing periods that would be (re)calculated: ${periods.length}${periods.length ? ` (${periods.join(", ")})` : ""}`);
  console.log(`\nNothing was written. Run "run" to apply this.\n`);

  await mongoose.disconnect();
}

async function run() {
  await connectDB();
  await warnIfPoolShare();

  const cutoff = currentBillingPeriod();

  console.log(`Crediting historical reads before ${cutoff}...`);
  const backfillResult = await PostRead.updateMany(
    { billingPeriod: { $lt: cutoff }, readerIsSubscriber: true, completedRead: false },
    { $set: { completedRead: true } }
  );
  console.log(`  Credited ${backfillResult.modifiedCount} read(s) as completed.\n`);

  const periods = await findPastPeriods(cutoff);
  console.log(`Calculating earnings for ${periods.length} past period(s)...`);

  for (const period of periods) {
    const result = await calculateEarningsForPeriod(period);
    const distributable = (result.distributableAmount / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" });
    const scaled = result.payoutScaleFactor < 1 ? `, scaled to ${(result.payoutScaleFactor * 100).toFixed(1)}%` : "";
    console.log(`  ${period}: ${result.earningCreatorsCount} creator(s) earned, ${distributable} distributable${scaled}`);
  }

  console.log(`\nDone. Affected creators can request payouts for these periods once they have verified payout details in Settings.\n`);

  await mongoose.disconnect();
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === "run") await run();
    else if (command === "preview") await preview();
    else {
      console.log(`
backfill-earnings — credit historical paid-post reads for earnings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands:
  preview    Report what would change — no writes
  run        Apply the backfill and calculate past periods' earnings

Examples:
  npx tsx scripts/backfill-earnings.ts preview
  npx tsx scripts/backfill-earnings.ts run

Only affects the "fixed_rate" payout model — see the comment at the top of
this file for why. Run "preview" first.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

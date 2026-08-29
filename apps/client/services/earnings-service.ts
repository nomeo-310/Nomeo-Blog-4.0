import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Payment, PaymentGatewayStatus, PaymentPurpose } from "@/models/payment";
import { Plan, type PlanInterval } from "@/models/plan";
import { PostRead } from "@/models/post-read";
import { Post, type ICoAuthor } from "@/models/post";
import { PlatformEarningPeriod, CreatorEarning, type ICreatorEarning } from "@/models/creator-earning";
import { getPlatformSettings } from "@/models/platform-settings";
import { Notification } from "@/models/notification";

/** How many calendar months of service a Payment on this plan interval covers. */
const INTERVAL_MONTHS: Record<PlanInterval, number> = {
  monthly: 1,
  quarterly: 3,
  biannually: 6,
  yearly: 12,
};

/** The longest interval we sell — bounds how far back a payment could still be paying for the target month. */
const MAX_INTERVAL_MONTHS = 12;

/**
 * Earnings Service
 * ----------------
 * Runs the monthly creator-pay calculation described in
 * models/creator-earning.ts, in whichever mode PlatformSettings.payoutModel
 * is set to (admin-configurable from the dashboard's Settings page — never
 * hardcoded):
 *
 *   "fixed_rate" — a creator earns a flat ratePerCompletedRead for every
 *   subscriber who reads one of their paid posts to the end. If total
 *   demand (completed reads × rate, platform-wide) would exceed the
 *   period's distributable pool, every creator's payout is scaled down by
 *   the same factor so the platform never pays out more than it collected.
 *
 *   "pool_share" — the classic Medium-partner-program split: the pool is
 *   divided across creators by their share of platform-wide weighted
 *   subscriber read-minutes (a completed read weighted
 *   completedReadWeight× over a partial one).
 *
 * Both start the same way (sum successful subscription revenue → take the
 * platform's cut → the rest is DISTRIBUTABLE) and both split a co-authored
 * post's earning equally across the primary author and every accepted
 * co-author (Post has no custom-split field to honor, so equal is the only
 * defensible default).
 *
 * Only PostRead rows with readerIsSubscriber === true count — free-credit
 * and free-post reads earn nothing — and a reader is only ever counted once
 * per post, ever (PostRead's unique index), so re-reads can't be farmed for
 * extra pay.
 *
 * The platform's cut is only ever taken once, at the pool level — a
 * CreatorEarning's own platformCutAmount is always 0 (netAmount ===
 * grossAmount) so it isn't taken a second time per-creator.
 *
 * Payouts are a separate, later step: this only calculates and marks a
 * period "calculated" — a creator then requests a payout from their
 * earnings dashboard, and an admin honors it, which is what actually moves
 * money.
 */

interface PostAgg {
  postId: mongoose.Types.ObjectId;
  title: string;
  completedReadsCount: number;
  weightedReadMinutes: number;
  readerCount: number;
}

interface CreatorAgg {
  creatorId: mongoose.Types.ObjectId;
  completedReadsCount: number;
  weightedReadMinutes: number;
  posts: PostAgg[];
}

interface PostShare {
  postId: mongoose.Types.ObjectId;
  title: string;
  completedReadsCount: number;
  weightedReadMinutes: number;
  readerCount: number;
  /** This recipient's cut of the post's gross contribution (post-scaling, if any). */
  grossShare: number;
  /** Every recipient's cut, for the primary author's coAuthoredEarnings record. */
  allSplits: Array<{ userId: mongoose.Types.ObjectId; share: number; grossAmount: number }>;
}

interface RecipientAgg {
  completedReadsCount: number;
  weightedReadMinutes: number;
  posts: PostShare[];
}

/** Previous calendar month as "YYYY-MM" — the most recently CLOSED period. */
export function previousBillingPeriod(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodBounds(billingPeriod: string): { start: Date; end: Date } {
  const [year, month] = billingPeriod.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export interface EarningsCalculationResult {
  billingPeriod: string;
  payoutModel: "fixed_rate" | "pool_share";
  totalRevenueAmount: number;
  distributableAmount: number;
  payoutScaleFactor: number;
  earningCreatorsCount: number;
}

/**
 * Calculates and persists earnings for one billing period. Safe to re-run —
 * upserts both the PlatformEarningPeriod and each CreatorEarning.
 */
export async function calculateEarningsForPeriod(billingPeriod: string): Promise<EarningsCalculationResult> {
  await connectDB();

  const settings = await getPlatformSettings();
  const { start, end } = periodBounds(billingPeriod);

  // ── 1. The pool: this period's PRORATED slice of subscription revenue ───
  // A payment isn't revenue for the single month it was made in — a
  // quarterly/biannual/yearly plan pays once upfront but funds many months
  // of service. Recognizing the whole lump sum in the sign-up month would
  // pay creators as if that reader will never generate revenue again, while
  // every later month of their subscription would fund nothing even though
  // they're still reading. So each payment's amount is spread evenly, in
  // proportion to calendar days, across the exact [paidAt, paidAt +
  // planInterval) window it actually covers — this period only gets the
  // fraction of a payment that falls inside it.
  const earliestRelevantPaidAt = new Date(start);
  earliestRelevantPaidAt.setMonth(earliestRelevantPaidAt.getMonth() - MAX_INTERVAL_MONTHS);

  const candidatePayments = await Payment.find({
    purpose: PaymentPurpose.SUBSCRIPTION,
    gatewayStatus: PaymentGatewayStatus.SUCCESS,
    paidAt: { $gte: earliestRelevantPaidAt, $lt: end },
  }).lean();

  const planIds = [...new Set(candidatePayments.map((p) => String(p.planId)))];
  const plans = await Plan.find({ _id: { $in: planIds } }, { interval: 1 }).lean();
  const intervalByPlanId = new Map<string, PlanInterval>(plans.map((p) => [String(p._id), p.interval as PlanInterval]));

  let totalRevenueAmount = 0;
  for (const payment of candidatePayments) {
    if (!payment.paidAt) continue;
    const intervalMonths = INTERVAL_MONTHS[intervalByPlanId.get(String(payment.planId)) ?? "monthly"];

    const coveredStart = new Date(payment.paidAt);
    const coveredEnd = new Date(coveredStart);
    coveredEnd.setMonth(coveredEnd.getMonth() + intervalMonths);

    const overlapStart = coveredStart > start ? coveredStart : start;
    const overlapEnd = coveredEnd < end ? coveredEnd : end;
    if (overlapEnd <= overlapStart) continue; // this payment's coverage doesn't reach this period

    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000;
    const coveredDays = (coveredEnd.getTime() - coveredStart.getTime()) / 86_400_000;
    if (coveredDays <= 0) continue;

    totalRevenueAmount += (payment.amountPaid * overlapDays) / coveredDays;
  }
  totalRevenueAmount = Math.round(totalRevenueAmount);

  const platformCutAmount = Math.round((totalRevenueAmount * settings.platformCutPercent) / 100);
  const distributableAmount = Math.max(0, totalRevenueAmount - platformCutAmount);

  // ── 2. Per (creator, post): completed reads + weighted minutes ──────────
  const readRows: Array<{
    _id: { creatorId: mongoose.Types.ObjectId; postId: mongoose.Types.ObjectId };
    completedReadsCount: number;
    weightedMinutes: number;
    readerCount: number;
  }> = await PostRead.aggregate([
    { $match: { billingPeriod, readerIsSubscriber: true } },
    {
      $group: {
        _id: { creatorId: "$creatorId", postId: "$postId" },
        completedReadsCount: { $sum: { $cond: ["$completedRead", 1, 0] } },
        weightedMinutes: {
          $sum: {
            $multiply: [
              { $divide: ["$readDurationSeconds", 60] },
              { $cond: ["$completedRead", settings.completedReadWeight, 1] },
            ],
          },
        },
        readerCount: { $sum: 1 },
      },
    },
  ]);

  const activeSubscribersCount = await PostRead.distinct("userId", { billingPeriod, readerIsSubscriber: true }).then((ids) => ids.length);

  if (readRows.length === 0) {
    await PlatformEarningPeriod.findOneAndUpdate(
      { billingPeriod },
      {
        billingPeriod,
        payoutModel: settings.payoutModel,
        totalRevenueAmount,
        platformCutPercent: settings.platformCutPercent,
        platformCutAmount,
        distributableAmount,
        currency: settings.currency,
        totalCompletedReads: 0,
        ratePerCompletedRead: settings.ratePerCompletedRead,
        payoutScaleFactor: 1,
        totalWeightedReadMinutes: 0,
        activeSubscribersCount,
        earningCreatorsCount: 0,
        periodStatus: "calculated",
        calculatedAt: new Date(),
      },
      { upsert: true }
    );
    return { billingPeriod, payoutModel: settings.payoutModel, totalRevenueAmount, distributableAmount, payoutScaleFactor: 1, earningCreatorsCount: 0 };
  }

  const postIds = [...new Set(readRows.map((r) => String(r._id.postId)))];
  const posts = await Post.find(
    { _id: { $in: postIds } },
    { title: 1, authorId: 1, coAuthors: 1 }
  ).lean();
  const postById = new Map(posts.map((p) => [String(p._id), p]));

  // Group into creatorAgg (primary author → their posts).
  const creatorAggById = new Map<string, CreatorAgg>();
  let totalWeightedReadMinutes = 0;
  let totalCompletedReads = 0;
  for (const row of readRows) {
    const creatorKey = String(row._id.creatorId);
    const post = postById.get(String(row._id.postId));
    totalWeightedReadMinutes += row.weightedMinutes;
    totalCompletedReads += row.completedReadsCount;

    if (!creatorAggById.has(creatorKey)) {
      creatorAggById.set(creatorKey, { creatorId: row._id.creatorId, completedReadsCount: 0, weightedReadMinutes: 0, posts: [] });
    }
    const agg = creatorAggById.get(creatorKey)!;
    agg.completedReadsCount += row.completedReadsCount;
    agg.weightedReadMinutes += row.weightedMinutes;
    agg.posts.push({
      postId: row._id.postId,
      title: post?.title ?? "Untitled post",
      completedReadsCount: row.completedReadsCount,
      weightedReadMinutes: row.weightedMinutes,
      readerCount: row.readerCount,
    });
  }

  // ── 3. Pricing: raw per-post gross, then apply the chosen model ─────────
  const rawPostGross = new Map<string, number>(); // `${creatorKey}:${postId}` -> raw gross before co-author split
  let payoutScaleFactor = 1;

  if (settings.payoutModel === "fixed_rate") {
    let totalRawPayout = 0;
    for (const agg of creatorAggById.values()) {
      for (const post of agg.posts) {
        const raw = post.completedReadsCount * settings.ratePerCompletedRead;
        rawPostGross.set(`${agg.creatorId}:${post.postId}`, raw);
        totalRawPayout += raw;
      }
    }
    payoutScaleFactor = totalRawPayout > distributableAmount && totalRawPayout > 0 ? distributableAmount / totalRawPayout : 1;
  } else {
    // pool_share: distribute the pool by weighted-minutes share, then
    // spread each creator's gross across their posts proportionally.
    for (const agg of creatorAggById.values()) {
      if (totalWeightedReadMinutes === 0) continue;
      const readMinutesShare = agg.weightedReadMinutes / totalWeightedReadMinutes;
      const creatorGross = Math.round(distributableAmount * readMinutesShare);
      for (const post of agg.posts) {
        const raw = agg.weightedReadMinutes > 0 ? Math.round(creatorGross * (post.weightedReadMinutes / agg.weightedReadMinutes)) : 0;
        rawPostGross.set(`${agg.creatorId}:${post.postId}`, raw);
      }
    }
    payoutScaleFactor = 1; // the pool split is already bounded by construction
  }

  // ── 4. Split each post's (scaled) gross across primary + co-authors ─────
  const recipients = new Map<string, RecipientAgg>();

  const addShare = (userId: mongoose.Types.ObjectId, postShare: PostShare) => {
    const key = String(userId);
    if (!recipients.has(key)) recipients.set(key, { completedReadsCount: 0, weightedReadMinutes: 0, posts: [] });
    const r = recipients.get(key)!;
    const totalSplitters = postShare.allSplits.length || 1;
    // Attribute a proportional slice of the post's stats to this recipient
    // too, purely for display — the money itself is what's actually split.
    r.completedReadsCount += postShare.completedReadsCount / totalSplitters;
    r.weightedReadMinutes += postShare.weightedReadMinutes / totalSplitters;
    r.posts.push(postShare);
  };

  for (const agg of creatorAggById.values()) {
    for (const post of agg.posts) {
      const raw = rawPostGross.get(`${agg.creatorId}:${post.postId}`) ?? 0;
      const postGrossContribution = Math.round(raw * payoutScaleFactor);

      const postDoc = postById.get(String(post.postId));
      const acceptedCoAuthors = ((postDoc?.coAuthors ?? []) as ICoAuthor[]).filter((c) => c.status === "accepted");
      const splitRecipients = [agg.creatorId, ...acceptedCoAuthors.map((c) => c.userId)];
      const share = 1 / splitRecipients.length;
      const perRecipientAmount = Math.round(postGrossContribution * share);

      const allSplits = splitRecipients.map((userId) => ({ userId, share, grossAmount: perRecipientAmount }));

      for (const userId of splitRecipients) {
        addShare(userId, {
          postId: post.postId,
          title: post.title,
          completedReadsCount: post.completedReadsCount,
          weightedReadMinutes: post.weightedReadMinutes,
          readerCount: post.readerCount,
          grossShare: perRecipientAmount,
          allSplits: splitRecipients.length > 1 ? allSplits : [],
        });
      }
    }
  }

  // ── 5. Persist ────────────────────────────────────────────────────────
  const platformPeriod = await PlatformEarningPeriod.findOneAndUpdate(
    { billingPeriod },
    {
      billingPeriod,
      payoutModel: settings.payoutModel,
      totalRevenueAmount,
      platformCutPercent: settings.platformCutPercent,
      platformCutAmount,
      distributableAmount,
      currency: settings.currency,
      totalCompletedReads,
      ratePerCompletedRead: settings.ratePerCompletedRead,
      payoutScaleFactor,
      totalWeightedReadMinutes,
      activeSubscribersCount,
      earningCreatorsCount: recipients.size,
      periodStatus: "calculated",
      calculatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  for (const [creatorKey, recipient] of recipients) {
    const netAmount = recipient.posts.reduce((sum, p) => sum + p.grossShare, 0);
    const topPosts = [...recipient.posts]
      .sort((a, b) => b.completedReadsCount - a.completedReadsCount)
      .slice(0, 5)
      .map((p) => ({
        postId: p.postId,
        title: p.title,
        completedReadsCount: Math.round(p.completedReadsCount * 100) / 100,
        weightedReadMinutes: Math.round(p.weightedReadMinutes * 100) / 100,
        readerCount: p.readerCount,
        grossContribution: p.grossShare,
      }));

    const coAuthoredEarnings = recipient.posts
      .filter((p) => p.allSplits.length > 1)
      .map((p) => ({ postId: p.postId, splits: p.allSplits }));

    const readMinutesShare = totalWeightedReadMinutes > 0 ? recipient.weightedReadMinutes / totalWeightedReadMinutes : 0;

    const existing = await CreatorEarning.findOne({ creatorId: creatorKey, billingPeriod });
    const wasAlreadyRequested = existing?.payoutRequestedAt;

    const update: Partial<ICreatorEarning> = {
      creatorId: new mongoose.Types.ObjectId(creatorKey),
      billingPeriod,
      platformPeriodId: platformPeriod._id,
      payoutModel: settings.payoutModel,
      completedReadsCount: Math.round(recipient.completedReadsCount * 100) / 100,
      ratePerCompletedRead: settings.ratePerCompletedRead,
      payoutScaleFactor,
      weightedReadMinutes: Math.round(recipient.weightedReadMinutes * 100) / 100,
      readMinutesShare,
      grossAmount: netAmount,
      platformCutAmount: 0, // the cut is taken once, at the pool level — never per-creator
      netAmount,
      currency: settings.currency,
      topPosts,
      coAuthoredEarnings,
      // A re-run recalculates the numbers but never reopens a payout that's
      // already in flight or done — those statuses are left alone below.
      ...(existing && ["processing", "paid"].includes(existing.payoutStatus) ? {} : { payoutStatus: "calculated" as const }),
    };

    await CreatorEarning.findOneAndUpdate({ creatorId: creatorKey, billingPeriod }, update, { upsert: true });

    // First time this creator crosses into having a calculated payout this
    // period — let them know there's something to request.
    if (!existing && !wasAlreadyRequested) {
      await Notification.create({
        recipientId: new mongoose.Types.ObjectId(creatorKey),
        type: "earnings_milestone",
        message: `Your ${billingPeriod} earnings are ready — ${netAmount} ${settings.currency} available to request as a payout.`,
        entityType: "earning",
      });
    }
  }

  return { billingPeriod, payoutModel: settings.payoutModel, totalRevenueAmount, distributableAmount, payoutScaleFactor, earningCreatorsCount: recipients.size };
}

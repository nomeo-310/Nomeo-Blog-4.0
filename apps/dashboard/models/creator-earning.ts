import mongoose, { Schema, Document } from "mongoose";

/**
 * CreatorEarning Model
 * --------------------
 * Two payout models — see PlatformSettings.payoutModel, the admin-configurable
 * switch (Settings page). Both start the same way and end the same way; only
 * step 3 differs.
 *
 * 1. All subscriber fees collected in a billing period form the POOL.
 *    The platform takes a percentage cut (PlatformSettings.platformCutPercent)
 *    — the rest is DISTRIBUTABLE.
 *
 * 2. Every time a SUBSCRIBER reads a paid post, PostRead records:
 *      - readDurationSeconds  (how long they spent)
 *      - completedRead        (did they reach the end?)
 *      - billingPeriod        (which month this counts toward)
 *    A reader is only ever recorded once per post, ever (PostRead's unique
 *    index) — re-reads can't inflate a creator's numbers.
 *
 * 3. At the end of each billing period a background job computes each
 *    creator's payout one of two ways:
 *
 *    "fixed_rate" — grossAmount = completedReadsCount × ratePerCompletedRead
 *    (a flat, known-in-advance rate). If the platform-wide total of these
 *    raw amounts would exceed the period's distributableAmount, every
 *    creator's payout is scaled down by the same payoutScaleFactor so the
 *    platform never pays out more than it collected.
 *
 *    "pool_share" — grossAmount = distributableAmount × readMinutesShare,
 *    where readMinutesShare is this creator's fraction of platform-wide
 *    weighted subscriber read-minutes (a completed read weighted
 *    completedReadWeight× over a partial one). Always exactly exhausts the
 *    pool; payoutScaleFactor stays 1.
 *
 *    Either way: writes one CreatorEarning per creator per period and one
 *    PlatformEarningPeriod for the platform totals.
 *
 * 4. For co-authored posts the gross earning for that post is split equally
 *    across the primary author and every accepted co-author (Post has no
 *    custom-split field, so equal is the only defensible default) —
 *    recorded per-post in coAuthoredEarnings.
 *
 * 5. Payouts are sent via Paystack Transfers once the creator requests one
 *    and an admin honors it. CreatorEarning.payoutStatus tracks that.
 *
 * Two schemas:
 *   PlatformEarningPeriod  →  platform-wide pool totals for a billing period
 *   CreatorEarning         →  one creator's earnings for a billing period
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type PayoutStatus =
  | "pending"     // period not yet closed; earnings still accumulating
  | "calculated"  // earnings computed; awaiting payout transfer
  | "processing"  // payout transfer initiated
  | "paid"        // transfer confirmed by payment provider
  | "failed"      // transfer failed; will retry
  | "on_hold";    // manual hold by admin (e.g. suspended creator)

/* ══════════════════════════════════════════════════════════════════════════
   PlatformEarningPeriod  — pool totals for one billing month
   ══════════════════════════════════════════════════════════════════════════ */

export interface IPlatformEarningPeriod extends Document {
  _id: mongoose.Types.ObjectId;

  /**
   * Billing period identifier: "YYYY-MM" e.g. "2025-09".
   * Matches PostRead.billingPeriod.
   */
  billingPeriod: string;

  /** Which pricing model produced this period's numbers — a snapshot, since PlatformSettings can change later. */
  payoutModel: "fixed_rate" | "pool_share";

  /** Total revenue collected from all active subscriptions in this period */
  totalRevenueAmount: number;

  /** Platform cut percentage e.g. 30 means 30% */
  platformCutPercent: number;

  /** Platform's cut in currency units */
  platformCutAmount: number;

  /** Amount available for creator payouts (totalRevenue - platformCut) */
  distributableAmount: number;

  /** ISO 4217 currency */
  currency: string;

  /** Total completed subscriber reads across all creators this period */
  totalCompletedReads: number;

  /** fixed_rate only: the sticker rate used this period (smallest currency unit) */
  ratePerCompletedRead: number;

  /**
   * fixed_rate only: 1.0 unless demand exceeded the pool, in which case
   * every creator's raw (reads × rate) payout was scaled down by this
   * factor so total payouts never exceeded distributableAmount.
   */
  payoutScaleFactor: number;

  /** pool_share only: total weighted subscriber read-minutes across all creators this period */
  totalWeightedReadMinutes: number;

  /** Number of active subscribers during this period */
  activeSubscribersCount: number;

  /** Number of creators who earned something this period */
  earningCreatorsCount: number;

  /**
   * Status of this period's payout run.
   * "open"       → still accumulating reads (current month)
   * "closed"     → period ended; earnings job has not yet run
   * "calculated" → earnings job completed; payouts not yet sent
   * "paid"       → all creator payouts have been processed
   */
  periodStatus: "open" | "closed" | "calculated" | "paid";

  /** When the earnings calculation job ran */
  calculatedAt?: Date;

  /** When the last payout transfer for this period was initiated */
  payoutsInitiatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const PlatformEarningPeriodSchema = new Schema<IPlatformEarningPeriod>(
  {
    billingPeriod:            { type: String, required: true, unique: true }, // "YYYY-MM"
    payoutModel:              { type: String, enum: ["fixed_rate", "pool_share"], required: true, default: "fixed_rate" },
    totalRevenueAmount:       { type: Number, required: true, min: 0 },
    platformCutPercent:       { type: Number, required: true, min: 0, max: 100 },
    platformCutAmount:        { type: Number, required: true, min: 0 },
    distributableAmount:      { type: Number, required: true, min: 0 },
    currency:                 { type: String, required: true, uppercase: true, default: "NGN" },
    totalCompletedReads:      { type: Number, default: 0, min: 0 },
    ratePerCompletedRead:     { type: Number, default: 0, min: 0 },
    payoutScaleFactor:        { type: Number, default: 1, min: 0, max: 1 },
    totalWeightedReadMinutes: { type: Number, default: 0, min: 0 },
    activeSubscribersCount:   { type: Number, default: 0, min: 0 },
    earningCreatorsCount:     { type: Number, default: 0, min: 0 },
    periodStatus: {
      type: String,
      enum: ["open", "closed", "calculated", "paid"],
      default: "open",
      index: true,
    },
    calculatedAt:       { type: Date },
    payoutsInitiatedAt: { type: Date },
  },
  { timestamps: true, collection: "platform_earning_periods" }
);

export const PlatformEarningPeriod =
  mongoose.models.PlatformEarningPeriod ??
  mongoose.model<IPlatformEarningPeriod>("PlatformEarningPeriod", PlatformEarningPeriodSchema);

/* ══════════════════════════════════════════════════════════════════════════
   CreatorEarning  — one creator's earnings for one billing period
   ══════════════════════════════════════════════════════════════════════════ */

export interface IEarningsSplit {
  /** User._id of the creator receiving this share (primary author or co-author) */
  userId: mongoose.Types.ObjectId;
  /**
   * Their share as a decimal e.g. 0.5 = 50%.
   * All splits for a post must sum to 1.0 — enforced at the application layer.
   */
  share: number;
  /** Their gross earning from this post in smallest currency unit */
  grossAmount: number;
}

export interface ICreatorEarning extends Document {
  _id: mongoose.Types.ObjectId;

  /** The creator receiving this earning */
  creatorId: mongoose.Types.ObjectId;

  billingPeriod: string; // "YYYY-MM"

  /** Reference to the platform-wide period totals */
  platformPeriodId: mongoose.Types.ObjectId;

  /** Which pricing model produced this row's numbers — matches the period's payoutModel. */
  payoutModel: "fixed_rate" | "pool_share";

  /** Subscriber reads of this creator's paid posts that reached the end, this period. */
  completedReadsCount: number;

  /** fixed_rate only: the sticker rate used (smallest currency unit) — same as the period's. */
  ratePerCompletedRead: number;

  /** fixed_rate only: scaling applied if total demand exceeded the pool — same as the period's. */
  payoutScaleFactor: number;

  /**
   * pool_share only: this creator's total weighted subscriber read-minutes
   * for the period. Computed by the earnings job from PostRead records.
   */
  weightedReadMinutes: number;

  /**
   * pool_share only: this creator's share of total platform read-minutes
   * (0.0 – 1.0). e.g. 0.034 = 3.4% of all subscriber reading happened on
   * their posts.
   */
  readMinutesShare: number;

  /** Gross earning before the monthly cap scaling (fixed_rate) or exactly the pool share (pool_share) */
  grossAmount: number;

  /** Platform's cut of this creator's gross — always 0 here; the cut is taken once, at the pool level */
  platformCutAmount: number;

  /** Net earning — what's actually paid out (grossAmount × payoutScaleFactor under fixed_rate) */
  netAmount: number;

  currency: string;

  payoutStatus: PayoutStatus;

  /**
   * Per-post breakdown — top posts that drove earnings this period.
   * Kept as an array of summaries (not the full PostRead query) for
   * quick dashboard display without re-running the aggregation.
   */
  topPosts: Array<{
    postId:              mongoose.Types.ObjectId;
    title:               string;
    completedReadsCount: number;
    weightedReadMinutes: number;
    readerCount:         number;
    grossContribution:   number; // amount this post contributed to grossAmount
  }>;

  /**
   * For posts co-authored with other creators, the split is recorded here.
   * Each entry shows how the gross earning from that post was divided.
   */
  coAuthoredEarnings: Array<{
    postId: mongoose.Types.ObjectId;
    splits: IEarningsSplit[];
  }>;

  /**
   * When the creator explicitly requested this payout be sent. An admin can
   * only "mark paid" a calculated earning once this is set — earnings sit
   * calculated-but-unrequested until the creator applies from their
   * earnings dashboard, they don't pay out automatically.
   */
  payoutRequestedAt?: Date;

  /** External payout transfer reference (Stripe / Paystack transfer ID) */
  payoutTransferId?:   string;
  payoutInitiatedAt?:  Date;
  payoutCompletedAt?:  Date;
  payoutFailureReason?: string;

  /** Admin notes (e.g. reason for hold) */
  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const EarningsSplitSchema = new Schema<IEarningsSplit>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    share:       { type: Number, required: true, min: 0, max: 1 },
    grossAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CreatorEarningSchema = new Schema<ICreatorEarning>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    billingPeriod: { type: String, required: true, index: true }, // "YYYY-MM"

    platformPeriodId: {
      type: Schema.Types.ObjectId,
      ref: "PlatformEarningPeriod",
      required: true,
    },

    payoutModel:          { type: String, enum: ["fixed_rate", "pool_share"], required: true, default: "fixed_rate" },
    completedReadsCount:  { type: Number, default: 0, min: 0 },
    ratePerCompletedRead: { type: Number, default: 0, min: 0 },
    payoutScaleFactor:    { type: Number, default: 1, min: 0, max: 1 },

    weightedReadMinutes: { type: Number, default: 0, min: 0 },
    readMinutesShare:    { type: Number, default: 0, min: 0, max: 1 },

    grossAmount:      { type: Number, required: true, min: 0 },
    platformCutAmount:{ type: Number, required: true, min: 0 },
    netAmount:        { type: Number, required: true, min: 0 },
    currency:         { type: String, required: true, uppercase: true, default: "NGN" },

    payoutStatus: {
      type: String,
      enum: ["pending", "calculated", "processing", "paid", "failed", "on_hold"],
      default: "pending",
      index: true,
    },

    topPosts: {
      type: [
        {
          postId:              { type: Schema.Types.ObjectId, ref: "Post" },
          title:               { type: String, maxlength: 300 },
          completedReadsCount: { type: Number, min: 0 },
          weightedReadMinutes: { type: Number, min: 0 },
          readerCount:         { type: Number, min: 0 },
          grossContribution:   { type: Number, min: 0 },
        },
      ],
      default: [],
    },

    coAuthoredEarnings: {
      type: [
        {
          postId: { type: Schema.Types.ObjectId, ref: "Post" },
          splits: { type: [EarningsSplitSchema], default: [] },
        },
      ],
      default: [],
    },

    payoutRequestedAt:   { type: Date },
    payoutTransferId:    { type: String },
    payoutInitiatedAt:   { type: Date },
    payoutCompletedAt:   { type: Date },
    payoutFailureReason: { type: String, maxlength: 500 },
    adminNotes:          { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: "creator_earnings" }
);

/** One earning record per creator per billing period */
CreatorEarningSchema.index({ creatorId: 1, billingPeriod: 1 }, { unique: true });

/** Payout job: all creators with calculated but unpaid earnings */
CreatorEarningSchema.index({ payoutStatus: 1, billingPeriod: 1 });

export const CreatorEarning =
  mongoose.models.CreatorEarning ??
  mongoose.model<ICreatorEarning>("CreatorEarning", CreatorEarningSchema);

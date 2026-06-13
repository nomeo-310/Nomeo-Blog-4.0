import mongoose, { Schema, Document } from "mongoose";

/**
 * CreatorEarning Model
 * --------------------
 * Implements the Medium partner program payout model.
 *
 * How it works:
 * ─────────────
 * 1. All subscriber fees collected in a billing period form the POOL.
 *    The platform takes a percentage cut (e.g. 30%) — the rest is DISTRIBUTABLE.
 *
 * 2. Every time a SUBSCRIBER reads a paid post, PostRead records:
 *      - readDurationSeconds  (how long they spent)
 *      - completedRead        (did they reach the end?)
 *      - billingPeriod        (which month this counts toward)
 *
 * 3. At the end of each billing period a background job:
 *    a. Sums each creator's total WEIGHTED read-minutes from subscribers.
 *       Weighting: completedRead reads count 1.5× partial reads.
 *    b. Divides by total platform-wide weighted subscriber read-minutes.
 *    c. Multiplies by the distributable pool → creator's gross earning.
 *    d. Applies the platform cut → creator's net earning.
 *    e. Writes one CreatorEarning document per creator per period.
 *    f. Writes one PlatformEarningPeriod document for the platform totals.
 *
 * 4. For co-authored posts the gross earning for that post is split across
 *    the primary author and accepted co-authors per earningsSplit[].
 *    Default split: equal share. Primary author sets custom splits when
 *    inviting co-authors (stored in earningsSplit, enforced to sum to 1.0).
 *
 * 5. Payouts are sent via the external payment provider.
 *    CreatorEarning.payoutStatus tracks the transfer lifecycle.
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

  /** Total weighted subscriber read-minutes across all creators this period */
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
    totalRevenueAmount:       { type: Number, required: true, min: 0 },
    platformCutPercent:       { type: Number, required: true, min: 0, max: 100 },
    platformCutAmount:        { type: Number, required: true, min: 0 },
    distributableAmount:      { type: Number, required: true, min: 0 },
    currency:                 { type: String, required: true, uppercase: true, default: "NGN" },
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

  /**
   * This creator's total weighted subscriber read-minutes for the period.
   * Computed by the earnings job from PostRead records.
   */
  weightedReadMinutes: number;

  /**
   * This creator's share of total platform read-minutes (0.0 – 1.0).
   * e.g. 0.034 = 3.4% of all subscriber reading happened on their posts.
   */
  readMinutesShare: number;

  /** Gross earning before platform cut (distributableAmount × readMinutesShare) */
  grossAmount: number;

  /** Platform's cut of this creator's gross */
  platformCutAmount: number;

  /** Net earning after platform cut */
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
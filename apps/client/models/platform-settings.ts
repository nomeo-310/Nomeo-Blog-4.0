import mongoose, { Schema, Document } from "mongoose";

/**
 * PlatformSettings Model
 * -----------------------
 * A single global document holding the admin-configurable knobs for creator
 * pay (see models/creator-earning.ts and services/earnings-service.ts for
 * how these feed the monthly calculation job). Editable from the admin
 * dashboard's Settings page — never hardcoded, so pricing can be tuned or
 * switched without a deploy.
 *
 * Two payout models, chosen by payoutModel:
 *
 *   "fixed_rate" — a writer earns a flat ratePerCompletedRead for every
 *   subscriber who reads one of their paid posts to the end. Partial reads
 *   earn nothing. This is the number shown to writers as "what a read is
 *   worth" — simple and known in advance. The one thing it can't promise on
 *   its own is that the platform never pays out more than it collected, so
 *   each month, if (completed reads × rate) would exceed that month's
 *   distributable subscription revenue, every creator's payout is scaled
 *   down by the same factor — writers are told when this happens.
 *
 *   "pool_share" — the classic Medium-partner-program model: the month's
 *   distributable revenue is split across creators by their share of total
 *   subscriber read-minutes, a completed read weighted
 *   completedReadWeight× over a partial one. Always exactly exhausts (never
 *   exceeds) the pool, but a read's cash value isn't knowable until the
 *   month closes and depends on everyone else's activity too.
 *
 * Either way, a reader is only ever counted once per post, ever (PostRead's
 * unique index) — re-reads can't be farmed for extra pay.
 *
 * Singleton: there is always exactly one document. Use getPlatformSettings()
 * rather than querying the model directly — it creates the default row on
 * first read.
 */

export type PayoutModel = "fixed_rate" | "pool_share";

export interface IPlatformSettings extends Document {
  _id: mongoose.Types.ObjectId;

  /** Which pricing model governs how a creator's payout is calculated. */
  payoutModel: PayoutModel;

  /** Platform's cut of the monthly subscription pool, e.g. 30 means 30%. */
  platformCutPercent: number;

  /**
   * fixed_rate mode: what a creator earns per subscriber who completes one
   * paid post (smallest currency unit, e.g. kobo) — the sticker rate,
   * before any monthly cap scaling.
   */
  ratePerCompletedRead: number;

  /**
   * pool_share mode: weighting multiplier applied to a completed (vs.
   * partial) paid-post read when computing each creator's share of the pool.
   */
  completedReadWeight: number;

  /**
   * Minimum net payout (smallest currency unit) a creator can request at
   * once — below this, "Request payout" stays disabled and the balance
   * rolls forward into the next period instead of triggering a transfer.
   */
  minimumPayoutAmount: number;

  /** ISO 4217 currency code all the amounts above are denominated in. */
  currency: string;

  /** Admin who last changed these settings. */
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    payoutModel:          { type: String, enum: ["fixed_rate", "pool_share"], required: true, default: "fixed_rate" },
    platformCutPercent:   { type: Number, required: true, min: 0, max: 100, default: 30 },
    ratePerCompletedRead: { type: Number, required: true, min: 0,           default: 1500 }, // ₦15
    completedReadWeight:  { type: Number, required: true, min: 1, max: 5,   default: 1.5 },
    minimumPayoutAmount:  { type: Number, required: true, min: 0,           default: 500000 }, // ₦5,000
    currency:             { type: String, required: true, uppercase: true, default: "NGN" },
    updatedBy:            { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "platform_settings" }
);

export const PlatformSettings =
  mongoose.models.PlatformSettings ??
  mongoose.model<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema);

/**
 * There is only ever one PlatformSettings document. Fetch it, creating the
 * defaulted row on first call so callers never have to null-check.
 */
export async function getPlatformSettings() {
  const existing = await PlatformSettings.findOne();
  if (existing) return existing;
  return PlatformSettings.create({});
}

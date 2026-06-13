import mongoose, { Schema, Document } from "mongoose";

/**
 * Subscription Model
 * ------------------
 * Platform-level subscription — readers pay the PLATFORM, not individual creators.
 * This is the Medium partner program model:
 *
 *   1. A reader subscribes to the platform (one active subscription at a time).
 *   2. Their monthly fee goes into a shared revenue pool.
 *   3. Creators are paid from that pool based on how much reading time their
 *      content attracted FROM SUBSCRIBERS during the billing period.
 *   4. Non-subscribers can still read free posts. Paid posts require either
 *      an active platform subscription OR spending a free-read credit.
 *
 * What this replaces:
 *   - Per-creator subscriptions are gone. There is no "subscribe to creator X".
 *   - The Lounge access rule changes: lounge access = active platform subscription
 *     + creator acceptance. No per-creator plan needed.
 *
 * Payout calculation lives in CreatorEarning (creator-earning.ts):
 *   creator's share = (creator's subscriber read-minutes / total platform read-minutes)
 *                     × distributable pool amount
 *
 * Payment processing is external (Stripe / Paystack).
 * Webhook handlers update this model — it is the source of truth for access control.
 */

export type SubscriptionStatus =
  | "active"      // paid and current — full access to paid content
  | "past_due"    // payment failed; grace period (still has access)
  | "cancelled"   // cancelled; access until currentPeriodEnd
  | "expired"     // period ended, not renewed — loses paid access
  | "trialing"    // free trial before first charge
  | "paused";     // paused by subscriber

export type SubscriptionInterval = "monthly" | "yearly";

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;

  /** The subscriber — any role except admin roles (user, creator) */
  subscriberId: mongoose.Types.ObjectId;

  /**
   * The Plan the subscriber chose.
   * References Plan._id — the price and interval are copied from the plan
   * at subscribe time and stored here so plan changes don't break history.
   */
  planId: mongoose.Types.ObjectId;

  status:   SubscriptionStatus;
  interval: SubscriptionInterval;

  /**
   * Price paid in smallest currency unit (e.g. kobo for NGN, cents for USD).
   * Stored at subscribe time — price changes don't affect existing subscriptions
   * until renewal.
   */
  priceAmount: number;

  /** ISO 4217 currency code e.g. "NGN", "USD" */
  currency: string;

  /** External payment provider IDs (Stripe / Paystack) */
  externalSubscriptionId?:  string;
  externalCustomerId?:      string;
  externalPaymentMethodId?: string;

  currentPeriodStart: Date;
  currentPeriodEnd:   Date;
  trialEndsAt?:       Date;
  cancelledAt?:       Date;
  autoRenew:          boolean;

  /** Full audit trail of status transitions */
  statusHistory: Array<{
    status:    SubscriptionStatus;
    changedAt: Date;
    reason?:   string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    subscriberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "expired", "trialing", "paused"],
      default: "active",
      index: true,
    },

    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    priceAmount: { type: Number, required: true, min: 0 },
    currency:    { type: String, required: true, uppercase: true, default: "NGN" },

    externalSubscriptionId:  { type: String, sparse: true },
    externalCustomerId:      { type: String },
    externalPaymentMethodId: { type: String },

    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd:   { type: Date, required: true, index: true },
    trialEndsAt:        { type: Date },
    cancelledAt:        { type: Date },
    autoRenew:          { type: Boolean, default: true },

    statusHistory: {
      type: [
        {
          status:    { type: String, enum: ["active", "past_due", "cancelled", "expired", "trialing", "paused"] },
          changedAt: { type: Date, default: () => new Date() },
          reason:    { type: String, maxlength: 300 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "subscriptions" }
);

/**
 * One active/trialing subscription per subscriber at a time.
 * A subscriber can't hold two active platform subscriptions simultaneously.
 */
SubscriptionSchema.index(
  { subscriberId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["active", "trialing", "past_due", "paused"] },
    },
  }
);

/** Renewal job: fetch subscriptions expiring soon */
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Subscription =
  mongoose.models.Subscription ??
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
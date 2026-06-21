import mongoose, { Schema, Document } from "mongoose";

/**
 * Advert Model
 * ------------
 * A single, flexible model for every kind of promotion on Nomeo. Rather than
 * four separate collections, one Advert carries a `type` and the union of
 * fields each type needs — they share ~80% of their shape (placement, schedule,
 * targeting, metrics) and differ mainly in who's behind them and what they
 * point to.
 *
 * Types:
 *   - sponsored      External brand pays for a slot. Billable. Restricted to
 *                    free readers by default to protect the ad-free promise.
 *   - house          Nomeo's own promo (e.g. "Go yearly", announcements).
 *                    Not billable. Can show to everyone.
 *   - promoted_post  Boosts an existing Post in feeds/discovery. Billable.
 *   - creator_promo  A creator pays to promote their own post or profile.
 *                    Billable, attributed to the creator.
 *
 * Placements (industry-standard slots, mapped to Nomeo surfaces):
 *   - feed_card            Native card inline in the feed.
 *   - in_article           Card placed within a single post, between sections.
 *   - notification_banner  Banner on the notifications page.
 *   - modal_popup          Dismissible popup (with frequency + dismiss controls).
 *
 * Audience gate:
 *   Members pay for ad-free reading, so `audience` decides who sees an advert.
 *   Sponsored adverts default to `free_only`; house promos to `all`.
 *
 * Lifecycle (application → approval → live):
 *   draft → pending_review → approved → scheduled/active → completed
 *                          ↘ rejected
 *   - Creators apply for creator_promo; advertisers' sponsored adverts are
 *     submitted too. They move draft → pending_review on submit.
 *   - An admin reviews: approve (→ approved, then scheduled if startAt is in
 *     the future, else active) or reject (→ rejected with a reviewNote).
 *   - House promos created by an admin can skip review (requiresReview: false)
 *     and go straight to scheduled/active.
 *   - paused is an admin/owner pause of a live advert; completed is past endAt.
 *   createdBy is the APPLICANT; reviewedBy is the admin who approved/rejected.
 *
 * Delivery:
 *   When multiple adverts qualify for the same slot+audience at request time,
 *   selection is weighted by `priority` then `weight`. Frequency capping
 *   (`maxImpressionsPerUser`) and popup `dismissBehavior` prevent fatigue.
 *   Impression/click counters are denormalised for fast reporting; CTR is
 *   derived. Per-user impression/dismiss tracking lives in a separate
 *   AdvertImpression collection (not here) to keep this document small.
 */

export type AdvertType = "sponsored" | "house" | "promoted_post" | "creator_promo";

export type AdvertPlacement =
  | "feed_card"
  | "in_article"
  | "notification_banner"
  | "modal_popup";

export type AdvertStatus =
  | "draft" // creator/advertiser is still composing
  | "pending_review" // submitted, awaiting admin decision
  | "approved" // admin approved; will go live at startAt (or immediately)
  | "rejected" // admin rejected (see reviewNote)
  | "scheduled" // approved + future startAt
  | "active" // currently live
  | "paused" // temporarily halted by admin/owner
  | "completed"; // past endAt or manually ended

export type AdvertAudience = "all" | "free_only" | "subscribers_only";

/** How a dismissible popup behaves once a user closes it. */
export type DismissBehavior = "once" | "session" | "always";

export type BillingStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";

export interface ICloudinaryImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

interface IAdvertTargeting {
  /** Topic slugs to target (empty = no topic restriction) */
  topics: string[];
  /** Who can see it relative to subscription status */
  audience: AdvertAudience;
  /** Optional country/region codes to limit delivery (empty = everywhere) */
  locations: string[];
}

interface IAdvertBilling {
  /** Amount charged in smallest currency unit (kobo for NGN) */
  amount: number;
  currency: string;
  status: BillingStatus;
  /** Payment provider reference (Paystack) */
  providerRef?: string;
  paidAt?: Date;
}

interface IAdvertMetrics {
  impressions: number;
  clicks: number;
  /** Unique users who saw it (denormalised) */
  uniqueImpressions: number;
}

export interface IAdvert extends Document {
  _id: mongoose.Types.ObjectId;

  type: AdvertType;
  placement: AdvertPlacement;
  status: AdvertStatus;

  /** Headline / main text */
  title: string;
  /** Supporting copy (caption / body). Kept short for cards & banners. */
  body?: string;
  image?: ICloudinaryImage | null;

  /** Call to action */
  ctaLabel?: string;
  ctaUrl?: string;

  /* ── Who's behind it (varies by type) ──────────────────────────────── */

  /**
   * Who created/submitted the advert. For creator_promo this is the creator
   * applying; for sponsored an admin may create on a brand's behalf; for house
   * promos an admin. This is the APPLICANT, not the approver.
   */
  createdBy: mongoose.Types.ObjectId;

  /* ── Review workflow ───────────────────────────────────────────────── */

  /**
   * Whether this advert needs admin approval before going live. Creator promos
   * and sponsored adverts require review; house promos created by admins don't.
   */
  requiresReview: boolean;

  /** When the applicant submitted it for review */
  submittedAt?: Date;
  /** Admin who reviewed (approved or rejected) */
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  /** Reason shown to the applicant on rejection, or internal approval note */
  reviewNote?: string;

  /** sponsored: external advertiser details */
  advertiserName?: string;
  advertiserContact?: string;

  /** creator_promo: the creator paying to promote */
  creatorId?: mongoose.Types.ObjectId;

  /** promoted_post / creator_promo: the post being boosted */
  postId?: mongoose.Types.ObjectId;

  /* ── Targeting & audience ──────────────────────────────────────────── */

  targeting: IAdvertTargeting;

  /* ── Scheduling ────────────────────────────────────────────────────── */

  startAt?: Date;
  endAt?: Date;

  /* ── Delivery controls ─────────────────────────────────────────────── */

  /** Higher priority wins a contested slot first */
  priority: number;
  /** Tie-breaker weight for rotation among same-priority adverts */
  weight: number;
  /** Frequency cap: max times one user sees this (0 = unlimited) */
  maxImpressionsPerUser: number;

  /** modal_popup only: how it behaves after dismissal */
  dismissBehavior: DismissBehavior;
  /** modal_popup only: delay before showing, in seconds */
  popupDelaySeconds: number;

  /* ── Money ─────────────────────────────────────────────────────────── */

  /** house promos are not billable; the other three are */
  billable: boolean;
  billing?: IAdvertBilling | null;

  /* ── Metrics ───────────────────────────────────────────────────────── */

  metrics: IAdvertMetrics;

  createdAt: Date;
  updatedAt: Date;
}

const CloudinaryImageSchema = new Schema<ICloudinaryImage>(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    width:    { type: Number },
    height:   { type: Number },
  },
  { _id: false }
);

const AdvertTargetingSchema = new Schema<IAdvertTargeting>(
  {
    topics:    { type: [String], default: [] },
    audience:  { type: String, enum: ["all", "free_only", "subscribers_only"], default: "all" },
    locations: { type: [String], default: [] },
  },
  { _id: false }
);

const AdvertBillingSchema = new Schema<IAdvertBilling>(
  {
    amount:      { type: Number, required: true, min: 0 },
    currency:    { type: String, required: true, uppercase: true, default: "NGN" },
    status:      { type: String, enum: ["unpaid", "pending", "paid", "refunded", "failed"], default: "unpaid" },
    providerRef: { type: String, trim: true },
    paidAt:      { type: Date },
  },
  { _id: false }
);

const AdvertMetricsSchema = new Schema<IAdvertMetrics>(
  {
    impressions:       { type: Number, default: 0, min: 0 },
    clicks:            { type: Number, default: 0, min: 0 },
    uniqueImpressions: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AdvertSchema = new Schema<IAdvert>(
  {
    type: {
      type: String,
      enum: ["sponsored", "house", "promoted_post", "creator_promo"],
      required: true,
      index: true,
    },
    placement: {
      type: String,
      enum: ["feed_card", "in_article", "notification_banner", "modal_popup"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "scheduled",
        "active",
        "paused",
        "completed",
      ],
      default: "draft",
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    body:  { type: String, trim: true, maxlength: 400 },
    image: { type: CloudinaryImageSchema, default: null },

    ctaLabel: { type: String, trim: true, maxlength: 40 },
    ctaUrl:   { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    requiresReview: { type: Boolean, default: true },
    submittedAt:    { type: Date },
    reviewedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt:     { type: Date },
    reviewNote:     { type: String, trim: true, maxlength: 500 },

    advertiserName:    { type: String, trim: true, maxlength: 120 },
    advertiserContact: { type: String, trim: true, maxlength: 200 },

    creatorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    postId:    { type: Schema.Types.ObjectId, ref: "Post", index: true },

    targeting: { type: AdvertTargetingSchema, default: () => ({}) },

    startAt: { type: Date },
    endAt:   { type: Date },

    priority:              { type: Number, default: 0 },
    weight:                { type: Number, default: 1, min: 0 },
    maxImpressionsPerUser: { type: Number, default: 0, min: 0 },

    dismissBehavior:   { type: String, enum: ["once", "session", "always"], default: "session" },
    popupDelaySeconds: { type: Number, default: 0, min: 0 },

    billable: { type: Boolean, default: true },
    billing:  { type: AdvertBillingSchema, default: null },

    metrics: { type: AdvertMetricsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "adverts" }
);

/**
 * Delivery query: find live adverts for a slot, ordered by priority then weight.
 * The app further filters by audience (vs the viewer's subscription status),
 * schedule window, targeting, and per-user frequency cap at request time.
 */
AdvertSchema.index({ placement: 1, status: 1, priority: -1, weight: -1 });

/** Schedule sweeps: activate scheduled / complete expired adverts. */
AdvertSchema.index({ status: 1, startAt: 1, endAt: 1 });

/** Admin review queue: pending adverts, oldest submission first. */
AdvertSchema.index({ status: 1, submittedAt: 1 });

/** Applicant's own adverts (creator dashboard "my promotions"). */
AdvertSchema.index({ createdBy: 1, status: 1 });

/** Click-through rate, derived (not stored). */
AdvertSchema.virtual("ctr").get(function (this: IAdvert) {
  if (!this.metrics?.impressions) return 0;
  return this.metrics.clicks / this.metrics.impressions;
});

export const Advert =
  mongoose.models.Advert ?? mongoose.model<IAdvert>("Advert", AdvertSchema);
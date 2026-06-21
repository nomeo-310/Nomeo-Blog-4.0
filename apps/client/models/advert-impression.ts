import mongoose, { Schema, Document } from "mongoose";

/**
 * AdvertImpression Model
 * ----------------------
 * Tracks how each user has interacted with each advert, so the delivery layer
 * can enforce frequency caps (maxImpressionsPerUser) and remember popup
 * dismissals (dismissBehavior).
 *
 * Kept separate from Advert so the advert document stays small while this
 * potentially large, write-heavy collection scales independently.
 *
 * One document per (advertId, userId). For logged-out visitors, userId is null
 * and an anonymous `visitorKey` (e.g. a cookie id) is used instead.
 */

export interface IAdvertImpression extends Document {
  _id: mongoose.Types.ObjectId;

  advertId: mongoose.Types.ObjectId;

  /** Logged-in user, if any */
  userId?: mongoose.Types.ObjectId | null;
  /** Anonymous identifier for logged-out visitors (cookie-based) */
  visitorKey?: string | null;

  /** How many times this user has seen the advert */
  impressions: number;
  /** Whether the user clicked it at least once */
  clicked: boolean;
  /** Whether the user dismissed it (popups) */
  dismissed: boolean;

  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertImpressionSchema = new Schema<IAdvertImpression>(
  {
    advertId: { type: Schema.Types.ObjectId, ref: "Advert", required: true, index: true },

    userId:     { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    visitorKey: { type: String, default: null, index: true },

    impressions: { type: Number, default: 0, min: 0 },
    clicked:     { type: Boolean, default: false },
    dismissed:   { type: Boolean, default: false },

    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "advert_impressions" }
);

/** One record per advert per user (or per anonymous visitor). */
AdvertImpressionSchema.index({ advertId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });
AdvertImpressionSchema.index({ advertId: 1, visitorKey: 1 }, { unique: true, partialFilterExpression: { visitorKey: { $type: "string" } } });

export const AdvertImpression =
  mongoose.models.AdvertImpression ??
  mongoose.model<IAdvertImpression>("AdvertImpression", AdvertImpressionSchema);
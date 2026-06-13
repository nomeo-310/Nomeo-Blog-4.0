import mongoose, { Schema, Document } from "mongoose";

/**
 * Plan Model
 * ----------
 * Admin-created platform subscription plans that users choose from
 * when subscribing. Examples: "Monthly", "Yearly", "Student Discount".
 *
 * Relationship to Subscription:
 *   Subscription.planId → Plan._id
 *   The plan is the template; the subscription is the active instance.
 *   Price changes to a plan do NOT affect existing active subscriptions —
 *   subscribers keep the price they signed up at until renewal.
 *
 * Only admins and super_admins can create, edit, or archive plans.
 * At least one plan must be active at all times (enforced at app layer).
 *
 * A plan marked isHighlighted is shown as the recommended option
 * on the subscribe page (only one should be highlighted at a time —
 * enforced at the app layer).
 */

export type PlanStatus   = "active" | "archived" | "draft";
export type PlanInterval = "monthly" | "yearly";

export interface IPlanFeature {
  /** Short label shown in the features list e.g. "Unlimited paid post access" */
  label: string;
  /** Whether this is a positive feature (true) or a limitation note (false) */
  isHighlighted: boolean;
}

export interface IPlan extends Document {
  _id: mongoose.Types.ObjectId;

  /** Admin who created this plan */
  createdBy: mongoose.Types.ObjectId;

  name: string;

  /** Short description shown on the subscribe page */
  description?: string;

  interval: PlanInterval;

  /**
   * Price in smallest currency unit e.g. kobo for NGN, cents for USD.
   * This is the price new subscribers pay. Existing subscribers are
   * grandfathered at the price stored on their Subscription document.
   */
  priceAmount: number;

  /** ISO 4217 currency code */
  currency: string;

  /**
   * External price ID on the payment provider (Stripe price ID /
   * Paystack plan code). Required before the plan can go live.
   */
  externalPriceId?: string;

  /**
   * Whether this plan offers a free trial.
   * trialDays: how many days the trial lasts (0 = no trial).
   */
  trialDays: number;

  /**
   * Features / benefits list shown on the subscribe page.
   * Ordered — rendered top to bottom.
   */
  features: IPlanFeature[];

  /**
   * Whether this plan is shown as the recommended / best-value option.
   * Only one plan should have this true at a time.
   */
  isHighlighted: boolean;

  /**
   * Whether this is the default plan pre-selected on the subscribe page.
   * Only one plan should have this true at a time.
   */
  isDefault: boolean;

  status: PlanStatus;

  /**
   * Sort order on the subscribe page — lower number appears first.
   */
  sortOrder: number;

  /** Denormalised count of currently active subscribers on this plan */
  activeSubscribersCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const PlanFeatureSchema = new Schema<IPlanFeature>(
  {
    label:         { type: String, required: true, trim: true, maxlength: 150 },
    isHighlighted: { type: Boolean, default: true },
  },
  { _id: false }
);

const PlanSchema = new Schema<IPlan>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300, trim: true },

    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    priceAmount: { type: Number, required: true, min: 0 },
    currency:    { type: String, required: true, uppercase: true, default: "NGN" },

    externalPriceId: { type: String, trim: true },

    trialDays: { type: Number, default: 0, min: 0 },

    features: { type: [PlanFeatureSchema], default: [] },

    isHighlighted: { type: Boolean, default: false },
    isDefault:     { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "draft",
      index: true,
    },

    sortOrder: { type: Number, default: 0 },

    activeSubscribersCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "plans" }
);

/** Subscribe page query: all active plans in display order */
PlanSchema.index({ status: 1, sortOrder: 1 });

export const Plan =
  mongoose.models.Plan ?? mongoose.model<IPlan>("Plan", PlanSchema);
import mongoose, { Schema, Document } from "mongoose";

/**
 * NewsletterSubscriber Model
 * --------------------------
 * PLATFORM-LEVEL mailing list — not per-creator.
 *
 * Who is on this list:
 *   - Visitors who fill the newsletter form on the landing page
 *     (no account needed — this is the lead-generation funnel).
 *   - Registered users who opt in to the platform digest.
 *
 * Who sends to this list:
 *   - Admins only, via Campaign (campaign.ts) with audience
 *     "newsletter_subscribers". There is no creator-owned mailing list.
 *
 * Creator reach is NOT handled here:
 *   - A creator's email audience = their followers (Following collection).
 *   - Post.sendAsNewsletter triggers an email of the post to followers
 *     whose Setting.notifications.emailNewPost allows it.
 *
 * If a form subscriber later creates an account with the same email,
 * the service layer links them by setting userId.
 */

export interface INewsletterSubscriber extends Document {
  _id: mongoose.Types.ObjectId;

  email: string;

  /** Display name for personalisation (optional on the form) */
  name?: string;

  /**
   * Linked platform account, if any.
   * Null for visitors who only filled the form.
   * Set by the service layer when an account with this email signs up.
   */
  userId?: mongoose.Types.ObjectId | null;

  /** Double opt-in: subscriber must click the confirmation link */
  isConfirmed:  boolean;
  confirmedAt?: Date;

  /** Token embedded in confirmation and unsubscribe links */
  unsubscribeToken: string;

  isUnsubscribed:  boolean;
  unsubscribedAt?: Date;

  /** Where the subscription came from */
  source: "landing_form" | "footer_form" | "onboarding" | "import";

  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    name: { type: String, trim: true, maxlength: 100 },

    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    isConfirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date },

    unsubscribeToken: { type: String, required: true, unique: true },

    isUnsubscribed:  { type: Boolean, default: false, index: true },
    unsubscribedAt:  { type: Date },

    source: {
      type: String,
      enum: ["landing_form", "footer_form", "onboarding", "import"],
      default: "landing_form",
    },
  },
  { timestamps: true, collection: "newsletter_subscribers" }
);

/** Campaign send query: all confirmed, still-subscribed addresses */
NewsletterSubscriberSchema.index({ isConfirmed: 1, isUnsubscribed: 1 });

export const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ??
  mongoose.model<INewsletterSubscriber>("NewsletterSubscriber", NewsletterSubscriberSchema);
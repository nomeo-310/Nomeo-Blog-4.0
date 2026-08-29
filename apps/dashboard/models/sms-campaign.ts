// models/sms-campaign.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * SmsCampaign — admin-created bulk SMS broadcast. Mirrors Campaign (campaign.ts)
 * for email, but targets phone numbers instead of email addresses.
 *
 * Audience:
 *   subscribers — NewsletterSubscriber documents that have a `phone` on file
 *   external    — phone numbers supplied directly (subscribers or not —
 *                 e.g. a purchased/imported list, event attendees, etc.)
 *   both        — subscribers-with-phone plus the external list
 *
 * Status flow: draft → sending → completed | failed | cancelled
 *
 * Delivery is provider-agnostic (see lib/sms-service.ts) — no specific SMS
 * gateway is wired by default until SMS_* env vars are configured.
 */

export enum SmsCampaignStatus {
  DRAFT     = "draft",
  SENDING   = "sending",
  COMPLETED = "completed",
  FAILED    = "failed",
  CANCELLED = "cancelled",
}

export enum SmsAudience {
  SUBSCRIBERS = "subscribers",
  EXTERNAL    = "external",
  BOTH        = "both",
}

export enum SmsStatus {
  PENDING = "pending",
  SENT    = "sent",
  FAILED  = "failed",
  DELIVERED = "delivered",
}

export interface ISmsCampaign {
  title:   string;
  /** Plain-text message body — most providers cap at 160 chars per SMS segment */
  message: string;
  audience: SmsAudience;
  status:   SmsCampaignStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  recipients: {
    total:      number;
    successful: number;
    failed:     number;
  };
  /** Manually supplied numbers — required when audience is "external" or "both" */
  externalRecipients?: Array<{ phone: string; name?: string }>;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISmsCampaignDocument extends ISmsCampaign, Document {}

const SmsCampaignSchema = new Schema<ISmsCampaignDocument>(
  {
    title:   { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 918 }, // ~6 concatenated SMS segments
    audience: { type: String, enum: Object.values(SmsAudience), required: true, default: SmsAudience.SUBSCRIBERS },
    status:   { type: String, enum: Object.values(SmsCampaignStatus), default: SmsCampaignStatus.DRAFT },

    scheduledFor: Date,
    sentAt:       Date,

    recipients: {
      total:      { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed:     { type: Number, default: 0 },
    },

    externalRecipients: [{ phone: { type: String, required: true }, name: String }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "sms_campaigns" }
);

SmsCampaignSchema.index({ status: 1 });
SmsCampaignSchema.index({ createdAt: -1 });

export const SmsCampaign =
  mongoose.models.SmsCampaign ||
  mongoose.model<ISmsCampaignDocument>("SmsCampaign", SmsCampaignSchema);

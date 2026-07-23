// models/campaign.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * Campaign — admin-created email broadcast to platform subscribers or
 * a custom external recipient list.
 *
 * Types:
 *   newsletter    — regular digest sent to newsletter subscribers
 *   announcement  — platform-wide update (new features, policy changes)
 *   promotion     — marketing / promotional send
 *
 * Status flow:
 *   draft → sending → completed | failed | cancelled
 *
 * Recipients are resolved at send time from the Newsletter collection
 * (active subscribers) filtered by the `filters` object, plus any
 * `externalRecipients` appended manually.
 */

export enum CampaignStatus {
  DRAFT     = "draft",
  SENDING   = "sending",
  COMPLETED = "completed",
  FAILED    = "failed",
  CANCELLED = "cancelled",
}

export enum CampaignType {
  NEWSLETTER   = "newsletter",
  ANNOUNCEMENT = "announcement",
  PROMOTION    = "promotion",
}

export enum EmailStatus {
  PENDING = "pending",
  SENT    = "sent",
  FAILED  = "failed",
  OPENED  = "opened",
  CLICKED = "clicked",
  BOUNCED = "bounced",
}

export interface ICampaign {
  title:     string;
  subject:   string;
  /** Sanitised HTML body — sanitise server-side before storing and before render */
  content:   string;
  type:      CampaignType;
  status:    CampaignStatus;
  scheduledFor?: Date;
  sentAt?:   Date;
  recipients: {
    total:      number;
    successful: number;
    failed:     number;
    opened:     number;
    clicked:    number;
  };
  /** Filter rules applied when resolving subscribers at send time */
  filters?: {
    /** Only send to subscribers with these statuses (e.g. ["active"]) */
    status?:          string[];
    /** Only subscribers created on or after this date */
    subscribedAfter?: Date;
  };
  /** Images uploaded via the campaign editor */
  images?: Array<{
    filename: string;
    url:      string;
    size:     number;
    width?:   number;
    height?:  number;
  }>;
  /** Non-subscriber recipients appended manually */
  externalRecipients?: Array<{ email: string; name?: string }>;
  hasExternalRecipients?: boolean;
  /** Newsletter subscriber ObjectIds resolved at send time */
  recipientIds?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaignDocument extends ICampaign, Document {}

const CampaignSchema = new Schema<ICampaignDocument>(
  {
    title:   { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    type:    { type: String, enum: Object.values(CampaignType), required: true, default: CampaignType.NEWSLETTER },
    status:  { type: String, enum: Object.values(CampaignStatus), default: CampaignStatus.DRAFT },

    scheduledFor: Date,
    sentAt:       Date,

    recipients: {
      total:      { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed:     { type: Number, default: 0 },
      opened:     { type: Number, default: 0 },
      clicked:    { type: Number, default: 0 },
    },

    filters: {
      status:          [String],
      subscribedAfter: Date,
    },

    images: [{
      filename: String,
      url:      String,
      size:     Number,
      width:    Number,
      height:   Number,
    }],

    externalRecipients:   [{ email: { type: String, required: true }, name: String }],
    hasExternalRecipients: { type: Boolean, default: false },
    recipientIds:          [{ type: Schema.Types.ObjectId, ref: "Newsletter" }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "campaigns" }
);

CampaignSchema.index({ status: 1 });
CampaignSchema.index({ createdAt: -1 });
CampaignSchema.index({ type: 1, status: 1 });

export const Campaign =
  mongoose.models.Campaign ||
  mongoose.model<ICampaignDocument>("Campaign", CampaignSchema);
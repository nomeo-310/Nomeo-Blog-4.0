// models/newsletter-email-log.ts
import mongoose, { Schema, Document } from "mongoose";
import { EmailStatus } from "./campaign";

/**
 * EmailLog — per-recipient send record for a campaign.
 * Created at send time (status: pending) and updated as events arrive
 * (sent, opened, clicked, bounced, failed).
 *
 * newsletterId is null for external recipients (not newsletter subscribers).
 */
export interface IEmailLog {
  campaignId:    mongoose.Types.ObjectId;
  newsletterId?: mongoose.Types.ObjectId | null;
  email:         string;
  name?:         string;
  recipientType: "subscriber" | "external";
  status:        EmailStatus;
  sentAt?:       Date;
  openedAt?:     Date;
  clickedAt?:    Date;
  error?:        string;
  metadata?:     Record<string, any>;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface IEmailLogDocument extends IEmailLog, Document {}

const EmailLogSchema = new Schema<IEmailLogDocument>(
  {
    campaignId:    { type: Schema.Types.ObjectId, ref: "Campaign",    required: true },
    newsletterId:  { type: Schema.Types.ObjectId, ref: "Newsletter",  required: false, default: null },
    email:         { type: String, required: true },
    name:          String,
    recipientType: { type: String, enum: ["subscriber", "external"], default: "subscriber" },
    status:        { type: String, enum: Object.values(EmailStatus),  default: EmailStatus.PENDING },
    sentAt:        Date,
    openedAt:      Date,
    clickedAt:     Date,
    error:         String,
    metadata:      Schema.Types.Mixed,
  },
  { timestamps: true, collection: "email_logs" }
);

EmailLogSchema.index({ campaignId: 1, status: 1 });
EmailLogSchema.index({ email: 1 });
EmailLogSchema.index({ createdAt: -1 });

export const EmailLog =
  mongoose.models.EmailLog ||
  mongoose.model<IEmailLogDocument>("EmailLog", EmailLogSchema);
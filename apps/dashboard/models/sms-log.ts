// models/sms-log.ts
import mongoose, { Schema, Document } from "mongoose";
import { SmsStatus } from "./sms-campaign";

/**
 * SmsLog — per-recipient send record for an SmsCampaign. Mirrors EmailLog.
 * subscriberId is null for external (non-subscriber) recipients.
 */
export interface ISmsLog {
  campaignId:    mongoose.Types.ObjectId;
  subscriberId?: mongoose.Types.ObjectId | null;
  phone:         string;
  name?:         string;
  recipientType: "subscriber" | "external";
  status:        SmsStatus;
  sentAt?:       Date;
  deliveredAt?:  Date;
  error?:        string;
  providerMessageId?: string;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface ISmsLogDocument extends ISmsLog, Document {}

const SmsLogSchema = new Schema<ISmsLogDocument>(
  {
    campaignId:    { type: Schema.Types.ObjectId, ref: "SmsCampaign", required: true },
    subscriberId:  { type: Schema.Types.ObjectId, ref: "NewsletterSubscriber", default: null },
    phone:         { type: String, required: true },
    name:          String,
    recipientType: { type: String, enum: ["subscriber", "external"], default: "subscriber" },
    status:        { type: String, enum: Object.values(SmsStatus), default: SmsStatus.PENDING },
    sentAt:        Date,
    deliveredAt:   Date,
    error:         String,
    providerMessageId: String,
  },
  { timestamps: true, collection: "sms_logs" }
);

SmsLogSchema.index({ campaignId: 1, status: 1 });
SmsLogSchema.index({ phone: 1 });
SmsLogSchema.index({ createdAt: -1 });

export const SmsLog =
  mongoose.models.SmsLog ||
  mongoose.model<ISmsLogDocument>("SmsLog", SmsLogSchema);

import mongoose, { Schema, Document } from "mongoose";

/**
 * Notification Model
 * ------------------
 * In-app notifications for all roles. Generated server-side.
 * TTL index auto-expires old notifications after 90 days by default.
 */

export type NotificationType =
  /* Social */
  | "follow_request_received" | "follow_request_accepted" | "follow_request_declined" | "new_follower"

  /* Content */
  | "new_post" | "post_liked" | "post_saved" | "post_featured" | "post_removed"

  /* Co-authoring */
  | "coauthor_invited" | "coauthor_accepted" | "coauthor_declined"

  /* Comments */
  | "new_comment" | "comment_reply" | "comment_liked" | "comment_removed"

  /* Lounge */
  | "lounge_join_request" | "lounge_join_accepted" | "lounge_join_declined"
  | "lounge_message" | "lounge_mention" | "lounge_suspended"

  /* Subscription & billing */
  | "subscription_started" | "subscription_renewed"
  | "subscription_expiring_soon" | "subscription_cancelled" | "subscription_failed"

  /* Earnings (creator only) */
  | "payout_processed"       // monthly earnings have been calculated and paid out
  | "earnings_milestone"     // creator hit a read-minutes milestone this month

  /* Creator upgrade */
  | "creator_upgrade_successful"  // user successfully upgraded to creator

  /* Moderation */
  | "report_filed" | "report_escalated"
  | "account_warned" | "account_banned" | "account_unbanned"

  /* System */
  | "system_announcement" | "free_reads_low" | "free_reads_exhausted";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  actorId?: mongoose.Types.ObjectId;
  message: string;
  isRead:  boolean;
  readAt?: Date;
  entityType?: "post" | "comment" | "lounge_message" | "connection_request" | "subscription" | "user" | "report" | "earning";
  entityId?:   mongoose.Types.ObjectId;
  /** TTL: MongoDB deletes the document automatically when this date is reached */
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "follow_request_received","follow_request_accepted","follow_request_declined","new_follower",
        "new_post","post_liked","post_saved","post_featured","post_removed",
        "coauthor_invited","coauthor_accepted","coauthor_declined",
        "new_comment","comment_reply","comment_liked","comment_removed",
        "lounge_join_request","lounge_join_accepted","lounge_join_declined",
        "lounge_message","lounge_mention","lounge_suspended",
        "subscription_started","subscription_renewed","subscription_expiring_soon",
        "subscription_cancelled","subscription_failed",
        "payout_processed","earnings_milestone",
        "creator_upgrade_successful",
        "report_filed","report_escalated",
        "account_warned","account_banned","account_unbanned",
        "system_announcement","free_reads_low","free_reads_exhausted",
      ],
      required: true,
    },
    actorId:   { type: Schema.Types.ObjectId, ref: "User" },
    message:   { type: String, required: true, maxlength: 500 },
    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date },
    entityType: {
      type: String,
      enum: ["post","comment","lounge_message","connection_request","subscription","user","report","earning"],
    },
    entityId:  { type: Schema.Types.ObjectId },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true, collection: "notifications" }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ?? mongoose.model<INotification>("Notification", NotificationSchema);
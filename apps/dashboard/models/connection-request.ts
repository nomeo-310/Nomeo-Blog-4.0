import mongoose, { Schema, Document } from "mongoose";

/**
 * ConnectionRequest Model
 * -----------------------
 * Governs the mutual-follow request system.
 *
 * When user/creator A wants to follow user/creator B, a pending request is
 * created. B must explicitly accept or decline before the Following record
 * is created.
 *
 * Both users and creators can follow each other — role is not restricted here.
 * Admin roles (moderator, admin, super_admin) do not participate in the social
 * graph and should be excluded at the application layer.
 *
 * On acceptance → Following document is created.
 * On acceptance between two creators → they become eligible to invite each
 * other as co-authors on posts.
 */

export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "blocked";

export interface IConnectionRequest extends Document {
  _id: mongoose.Types.ObjectId;

  /** The user/creator who initiated the follow request */
  requesterId: mongoose.Types.ObjectId;

  /** The user/creator who must accept or decline */
  recipientId: mongoose.Types.ObjectId;

  status: ConnectionRequestStatus;

  /** Optional personal message sent with the request */
  message?: string;

  /** When the recipient acted on the request */
  respondedAt?: Date;

  /**
   * Cooldown: requester cannot send another request to the same recipient
   * until after this date (set when status → "declined").
   */
  canResendAfter?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ConnectionRequestSchema = new Schema<IConnectionRequest>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "blocked"],
      default: "pending",
      index: true,
    },

    message:        { type: String, maxlength: 300, trim: true },
    respondedAt:    { type: Date },
    canResendAfter: { type: Date },
  },
  { timestamps: true, collection: "connection_requests" }
);

/** Pending request inbox for a recipient */
ConnectionRequestSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

/** Prevent duplicate pending requests between the same pair */
ConnectionRequestSchema.index(
  { requesterId: 1, recipientId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

export const ConnectionRequest =
  mongoose.models.ConnectionRequest ??
  mongoose.model<IConnectionRequest>("ConnectionRequest", ConnectionRequestSchema);
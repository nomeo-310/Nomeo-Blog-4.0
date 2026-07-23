import mongoose, { Schema, Document } from "mongoose";

/**
 * LoungeJoinRequest Model
 * -----------------------
 * Governs access to members-only (creator) lounges via request → approval.
 *
 * When a user wants to join a creator's members-only lounge, a pending request
 * is created. The lounge's creator must explicitly approve or decline before
 * the user becomes a member (a LoungeMember record / membership is granted).
 *
 * Open (platform) lounges do NOT use this — anyone authenticated can enter them
 * directly. This is only for kind: "creator" lounges with request-based access.
 *
 * On approval → the user is granted lounge membership.
 * On decline  → a cooldown prevents immediate re-requests (canResendAfter).
 *
 * Modeled to mirror ConnectionRequest for consistency.
 */

export type LoungeJoinRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

export interface ILoungeJoinRequest extends Document {
  _id: mongoose.Types.ObjectId;

  /** The lounge being requested */
  loungeId: mongoose.Types.ObjectId;

  /** The user asking to join */
  requesterId: mongoose.Types.ObjectId;

  /** The lounge's creator who must approve or decline (denormalized for inbox) */
  creatorId: mongoose.Types.ObjectId;

  status: LoungeJoinRequestStatus;

  /** Optional note the requester sends with the request */
  message?: string;

  /** When the creator acted on the request */
  respondedAt?: Date;

  /** Cooldown: cannot re-request until after this date (set on decline) */
  canResendAfter?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const LoungeJoinRequestSchema = new Schema<ILoungeJoinRequest>(
  {
    loungeId:    { type: Schema.Types.ObjectId, ref: "Lounge", required: true, index: true },
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creatorId:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "cancelled"],
      default: "pending",
      index: true,
    },

    message:        { type: String, maxlength: 300, trim: true },
    respondedAt:    { type: Date },
    canResendAfter: { type: Date },
  },
  { timestamps: true, collection: "lounge_join_requests" }
);

/** Pending request inbox for a creator */
LoungeJoinRequestSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

/** Look up a viewer's request for a given lounge quickly */
LoungeJoinRequestSchema.index({ loungeId: 1, requesterId: 1, status: 1 });

/** Prevent duplicate PENDING requests from the same user to the same lounge */
LoungeJoinRequestSchema.index(
  { loungeId: 1, requesterId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

export const LoungeJoinRequest =
  (mongoose.models.LoungeJoinRequest as mongoose.Model<ILoungeJoinRequest>) ||
  mongoose.model<ILoungeJoinRequest>("LoungeJoinRequest", LoungeJoinRequestSchema);
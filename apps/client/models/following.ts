import mongoose, { Schema, Document } from "mongoose";

/**
 * Following Model
 * ---------------
 * Records an active, accepted follow relationship.
 * Created only after a ConnectionRequest has been accepted.
 * Soft-deactivated on unfollow or block — never hard-deleted.
 */

export interface IFollowing extends Document {
  _id: mongoose.Types.ObjectId;
  followerId:  mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  connectionRequestId: mongoose.Types.ObjectId;
  isActive: boolean;
  deactivatedAt?: Date;
  notifyOnNewPost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FollowingSchema = new Schema<IFollowing>(
  {
    followerId:  { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    connectionRequestId: { type: Schema.Types.ObjectId, ref: "ConnectionRequest", required: true },
    isActive:       { type: Boolean, default: true, index: true },
    deactivatedAt:  { type: Date },
    notifyOnNewPost: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "followings" }
);

FollowingSchema.index(
  { followerId: 1, followingId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
FollowingSchema.index({ followingId: 1, isActive: 1 });

export const Following =
  mongoose.models.Following ?? mongoose.model<IFollowing>("Following", FollowingSchema);
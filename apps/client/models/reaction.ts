import mongoose, { Schema, Document } from "mongoose";

/**
 * Reaction Model
 * --------------
 * Source of truth for likes on posts and comments.
 *
 * Why this exists:
 *   Post.likesCount and Comment.likesCount are denormalised counters
 *   for fast feed rendering — but without this collection nothing stops
 *   a user from liking the same post repeatedly. The unique index here
 *   makes a reaction idempotent: like → insert, unlike → delete,
 *   counter incremented/decremented accordingly.
 *
 * Kept to a single "like" type for now. The `type` field exists so
 * additional reactions (fire, insightful, clap) can be added later
 * without a migration.
 */

export type ReactionTargetType = "post" | "comment";
export type ReactionType       = "like";

export interface IReaction extends Document {
  _id: mongoose.Types.ObjectId;

  /** Who reacted */
  userId: mongoose.Types.ObjectId;

  targetType: ReactionTargetType;

  /** Post._id or Comment._id depending on targetType */
  targetId: mongoose.Types.ObjectId;

  type: ReactionType;

  createdAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true, index: true },
    type:       { type: String, enum: ["like", "insightful", "celebrate", "curious"], default: "like" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "reactions",
  }
);

/** One reaction per user per target — like is idempotent */
ReactionSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

/** Count / list reactions on a target */
ReactionSchema.index({ targetType: 1, targetId: 1 });

export const Reaction =
  mongoose.models.Reaction ?? mongoose.model<IReaction>("Reaction", ReactionSchema);
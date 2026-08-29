import mongoose, { Schema, Document } from "mongoose";

/**
 * PostRead Model
 * --------------
 * One row per (user, post): whether/how they accessed it, how long they
 * spent, and whether they finished it. The initial row is written by
 * POST /api/posts/[slug]/view (upsert on first view); readDurationSeconds
 * and completedRead are then advanced by PATCH /api/posts/[slug]/view as
 * the reader progresses through the article (see post-view-tracker.tsx).
 *
 * This is what the monthly earnings job (services/earnings-service.ts)
 * aggregates over: only rows with readerIsSubscriber === true count toward
 * a creator's weighted read-minutes for the pool — see creator-earning.ts.
 *
 * Note: this collection ("post_reads") predates this model file and was
 * written to directly via the native driver. The schema here matches that
 * shape exactly so both can safely read/write it; this model exists purely
 * to give the earnings aggregation typed queries.
 */

export type AccessMethod = "free_post" | "free_credit" | "subscription";

export interface IPostRead extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  accessMethod: AccessMethod;
  /** Whether this reader had an active subscription at read time — only these count toward the pool. */
  readerIsSubscriber: boolean;
  readDurationSeconds: number;
  completedRead: boolean;
  /** "YYYY-MM" — which billing period this read counts toward. */
  billingPeriod: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostReadSchema = new Schema<IPostRead>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId:             { type: Schema.Types.ObjectId, ref: "Post", required: true },
    creatorId:          { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accessMethod:       { type: String, enum: ["free_post", "free_credit", "subscription"], required: true },
    readerIsSubscriber: { type: Boolean, default: false },
    readDurationSeconds:{ type: Number, default: 0, min: 0 },
    completedRead:      { type: Boolean, default: false },
    billingPeriod:      { type: String, required: true, index: true },
  },
  { timestamps: true, collection: "post_reads" }
);

PostReadSchema.index({ userId: 1, postId: 1 }, { unique: true });
PostReadSchema.index({ creatorId: 1, billingPeriod: 1 });

export const PostRead =
  mongoose.models.PostRead ?? mongoose.model<IPostRead>("PostRead", PostReadSchema);

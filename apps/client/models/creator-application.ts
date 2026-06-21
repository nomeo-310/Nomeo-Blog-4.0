// models/creator-application.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * CreatorApplication
 * ------------------
 * Submitted by users (role === "user") who want to become creators/writers.
 * Admins review and approve/reject from the admin panel.
 *
 * On approval: User.role → "creator", Profile.creatorStatus → "active"
 *
 * Statuses:
 *   pending  → submitted, awaiting review
 *   approved → admin approved; role upgrade done
 *   rejected → admin rejected; user may reapply after cooldown
 */

export type CreatorApplicationStatus = "pending" | "approved" | "rejected";

export interface ICreatorApplication extends Document {
  _id:      mongoose.Types.ObjectId;
  userId:   mongoose.Types.ObjectId;

  // What they want to write about
  writingTopics:  string;
  // Why they want to be a creator
  motivation:     string;
  // Optional: links to existing work / social
  portfolioLinks: string;
  // Optional: sample writing they paste in
  sampleContent:  string;

  status:      CreatorApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const CreatorApplicationSchema = new Schema<ICreatorApplication>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    writingTopics:  { type: String, default: "" },
    motivation:     { type: String, required: true },
    portfolioLinks: { type: String, default: "" },
    sampleContent:  { type: String, default: "" },
    status:         { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote:     { type: String },
    reviewedAt:     { type: Date },
  },
  { timestamps: true, collection: "creator_applications" }
);

// One pending application per user at a time
CreatorApplicationSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const CreatorApplication =
  mongoose.models.CreatorApplication ??
  mongoose.model<ICreatorApplication>("CreatorApplication", CreatorApplicationSchema);
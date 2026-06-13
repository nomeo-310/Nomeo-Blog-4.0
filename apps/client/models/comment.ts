import mongoose, { Schema, Document } from "mongoose";

/**
 * Comment Model
 * -------------
 * Supports threaded comments on posts (one level of nesting — reply to a
 * top-level comment). Comments can be reported and soft-deleted by moderators.
 */

export type CommentStatus = "visible" | "hidden" | "removed";
export type CommentReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "misinformation"
  | "sexual_content"
  | "other";

export interface ICommentReport {
  reportedBy: mongoose.Types.ObjectId;
  reason: CommentReportReason;
  details?: string;
  reportedAt: Date;
  reviewed: boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;

  /** The post this comment belongs to */
  postId: mongoose.Types.ObjectId;

  /** Author of the comment */
  authorId: mongoose.Types.ObjectId;

  /**
   * If set, this comment is a reply to another comment.
   * Null means it is a top-level comment.
   */
  parentId?: mongoose.Types.ObjectId | null;

  /** The comment body (plain text or light markdown) */
  body: string;

  status: CommentStatus;

  /** Soft-delete details */
  isRemoved: boolean;
  removedBy?: mongoose.Types.ObjectId;
  removedAt?: Date;
  removalReason?: string;

  /** Whether the author deleted their own comment (body replaced with placeholder) */
  isDeletedByAuthor: boolean;

  /** Upvote / reaction count */
  likesCount: number;

  /** Number of direct replies */
  repliesCount: number;

  /** Reports filed against this comment */
  reports: ICommentReport[];

  pendingReportsCount: number;

  /** True when the comment was made by the post's author */
  isAuthorReply: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CommentReportSchema = new Schema<ICommentReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "misinformation", "sexual_content", "other"],
      required: true,
    },
    details: { type: String, maxlength: 1000 },
    reportedAt: { type: Date, default: () => new Date() },
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: true }
);

const CommentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    body: { type: String, required: true, trim: true, maxlength: 5000 },

    status: {
      type: String,
      enum: ["visible", "hidden", "removed"],
      default: "visible",
      index: true,
    },

    isRemoved: { type: Boolean, default: false },
    removedBy: { type: Schema.Types.ObjectId, ref: "User" },
    removedAt: { type: Date },
    removalReason: { type: String, maxlength: 500 },

    isDeletedByAuthor: { type: Boolean, default: false },

    likesCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },

    reports: { type: [CommentReportSchema], default: [] },
    pendingReportsCount: { type: Number, default: 0, min: 0 },

    isAuthorReply: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "comments",
  }
);

/** Fetch all top-level comments for a post, newest first */
CommentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });

/** Moderator queue */
CommentSchema.index({ pendingReportsCount: -1, status: 1 });

export const Comment =
  mongoose.models.Comment ?? mongoose.model<IComment>("Comment", CommentSchema);
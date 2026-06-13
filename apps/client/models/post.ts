import mongoose, { Schema, Document } from "mongoose";

/**
 * Post Model
 * ----------
 * A blog post published by a creator (User.role === "creator") or from
 * the dashboard by a moderator/admin.
 *
 * Access model (Medium-style pool):
 *   "free" → anyone, including unauthenticated visitors, can read in full.
 *   "paid" → requires EITHER an active platform Subscription OR a free-read
 *            credit (Profile.freeReadsRemaining > 0). No per-creator paywall.
 *
 * Earnings model:
 *   PostRead tracks every read of a paid post by a subscriber. The platform
 *   totals subscriber read-minutes per creator each month and uses that ratio
 *   to distribute the revenue pool (see creator-earning.ts).
 *
 * Co-authoring:
 *   A creator can invite other creators (who are in their circle via an
 *   accepted ConnectionRequest) to collaborate. Each co-author has a role
 *   and must accept before they can edit. Revenue share for co-authored
 *   posts is split evenly across accepted co-authors by default and can be
 *   overridden in the earningsSplit array on CreatorEarning.
 *
 * Series:
 *   Posts can belong to an ordered PostSeries for multi-part long-form work.
 *
 * Three schemas in this file:
 *   Post        → the main post document
 *   PostSeries  → ordered container for a set of related posts
 *   PostRead    → one record per reader per post; drives earnings & deduplication
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type PostStatus     = "draft" | "published" | "archived" | "removed";
export type PostAccess     = "free" | "paid";
export type CoAuthorRole   = "writer" | "editor" | "reviewer";
export type CoAuthorStatus = "pending" | "accepted" | "declined" | "removed";

export type ReportReason =
  | "spam" | "misinformation" | "hate_speech"
  | "sexual_content" | "violence" | "copyright" | "other";

/* ── Sub-document interfaces ───────────────────────────────────────────── */

export interface IPostReport {
  reportedBy:  mongoose.Types.ObjectId;
  reason:      ReportReason;
  details?:    string;
  reportedAt:  Date;
  reviewed:    boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

export interface ICoAuthor {
  /** Invited creator's User._id */
  userId: mongoose.Types.ObjectId;
  role:   CoAuthorRole;
  status: CoAuthorStatus;

  invitedAt:    Date;
  respondedAt?: Date;

  /** Whether to credit this person on the published byline */
  showOnByline: boolean;

  /**
   * Opaque JSON blob — collaborative editor maps blocks to authors.
   * Handled entirely by the frontend.
   */
  sectionMeta?: string;
}

/* ── Main Post interface ───────────────────────────────────────────────── */

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;

  /** Primary publishing creator */
  authorId: mongoose.Types.ObjectId;

  /**
   * Invited co-authors. Must have an accepted ConnectionRequest with the author.
   * Revenue for co-authored posts is split across all accepted co-authors
   * (see CreatorEarning.earningsSplit).
   */
  coAuthors: ICoAuthor[];

  title:      string;
  slug:       string;
  excerpt?:   string;
  content:    string;
  coverImage?: string;

  tags:         string[];   // Topic slugs (see topic.ts) — normalised on publish
  category?:    string;
  readingTime?: number;   // minutes, computed on save

  access: PostAccess;

  /**
   * Optional series this post belongs to.
   * seriesOrder is the 1-based position within the series.
   */
  seriesId?:    mongoose.Types.ObjectId | null;
  seriesOrder?: number;

  status: PostStatus;

  /**
   * Creator's choice at publish time: also email this post to followers.
   * Recipients = active Following where the follower's
   * Setting.notifications.emailNewPost is true.
   * Sent via the platform transporter as "CreatorName via <Platform>".
   */
  sendAsNewsletter: boolean;

  /** Set once the follower-email job completes — prevents double-sending */
  newsletterSentAt?: Date;

  isFeatured: boolean;

  isRemoved:      boolean;
  removedBy?:     mongoose.Types.ObjectId;
  removedAt?:     Date;
  removalReason?: string;

  /** Engagement counters — denormalised for fast feed rendering */
  viewsCount:    number;
  likesCount:    number;
  commentsCount: number;
  savesCount:    number;   // how many users saved this post

  /**
   * Total subscriber read-minutes accumulated for this post.
   * Updated by the PostRead upsert job. Used as an input to the monthly
   * earnings calculation — NOT the earnings figure itself.
   */
  subscriberReadMinutes: number;

  reports:             IPostReport[];
  pendingReportsCount: number;

  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* ── Sub-schemas ───────────────────────────────────────────────────────── */

const PostReportSchema = new Schema<IPostReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["spam","misinformation","hate_speech","sexual_content","violence","copyright","other"],
      required: true,
    },
    details:    { type: String, maxlength: 1000 },
    reportedAt: { type: Date, default: () => new Date() },
    reviewed:   { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: true }
);

const CoAuthorSchema = new Schema<ICoAuthor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["writer", "editor", "reviewer"],
      default: "writer",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "removed"],
      default: "pending",
    },
    invitedAt:    { type: Date, default: () => new Date() },
    respondedAt:  { type: Date },
    showOnByline: { type: Boolean, default: true },
    sectionMeta:  { type: String },
  },
  { _id: true }
);

/* ── Main Post schema ──────────────────────────────────────────────────── */

const PostSchema = new Schema<IPost>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    coAuthors: { type: [CoAuthorSchema], default: [] },

    title:      { type: String, required: true, trim: true, maxlength: 300 },
    slug:       { type: String, required: true, trim: true, lowercase: true, maxlength: 350 },
    excerpt:    { type: String, maxlength: 500 },
    content:    { type: String, required: true },
    coverImage: { type: String },

    tags:        { type: [String], default: [], index: true },
    category:    { type: String, trim: true, index: true },
    readingTime: { type: Number, min: 1 },

    access: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
      index: true,
    },

    seriesId:    { type: Schema.Types.ObjectId, ref: "PostSeries", default: null, index: true },
    seriesOrder: { type: Number, min: 1 },

    status: {
      type: String,
      enum: ["draft", "published", "archived", "removed"],
      default: "draft",
      index: true,
    },

    isFeatured: { type: Boolean, default: false },

    sendAsNewsletter: { type: Boolean, default: false },
    newsletterSentAt: { type: Date },

    isRemoved:     { type: Boolean, default: false },
    removedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    removedAt:     { type: Date },
    removalReason: { type: String, maxlength: 500 },

    viewsCount:    { type: Number, default: 0, min: 0 },
    likesCount:    { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    savesCount:    { type: Number, default: 0, min: 0 },

    subscriberReadMinutes: { type: Number, default: 0, min: 0 },

    reports:             { type: [PostReportSchema], default: [] },
    pendingReportsCount: { type: Number, default: 0, min: 0 },

    publishedAt: { type: Date },
  },
  { timestamps: true, collection: "posts" }
);

PostSchema.index({ authorId: 1, slug: 1 }, { unique: true });
PostSchema.index({ status: 1, access: 1, publishedAt: -1 });
PostSchema.index({ "coAuthors.userId": 1, "coAuthors.status": 1 });
PostSchema.index({ pendingReportsCount: -1, status: 1 });

export const Post =
  mongoose.models.Post ?? mongoose.model<IPost>("Post", PostSchema);

/* ══════════════════════════════════════════════════════════════════════════
   PostSeries — ordered container for multi-part posts
   ══════════════════════════════════════════════════════════════════════════ */

export interface IPostSeries extends Document {
  _id: mongoose.Types.ObjectId;
  creatorId:    mongoose.Types.ObjectId;
  title:        string;
  description?: string;
  coverImage?:  string;
  isPublished:  boolean;
  postIds:      mongoose.Types.ObjectId[];
  postsCount:   number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSeriesSchema = new Schema<IPostSeries>(
  {
    creatorId:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    coverImage:  { type: String },
    isPublished: { type: Boolean, default: false },
    postIds:     { type: [{ type: Schema.Types.ObjectId, ref: "Post" }], default: [] },
    postsCount:  { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "post_series" }
);

export const PostSeries =
  mongoose.models.PostSeries ?? mongoose.model<IPostSeries>("PostSeries", PostSeriesSchema);

/* ══════════════════════════════════════════════════════════════════════════
   PostRead — one record per reader per post
   Powers: earnings calculation, free-credit deduction, duplicate prevention
   ══════════════════════════════════════════════════════════════════════════ */

export interface IPostRead extends Document {
  _id: mongoose.Types.ObjectId;

  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;

  /**
   * The creator who authored the post (denormalised for earnings queries).
   * For co-authored posts this is the primary author. The earnings split
   * across co-authors is handled in CreatorEarning.earningsSplit.
   */
  creatorId: mongoose.Types.ObjectId;

  /**
   * How access was granted:
   *   "free_post"    → post is free; no credit consumed
   *   "free_credit"  → a free-read credit was spent (freeReadsRemaining--)
   *   "subscription" → reader holds an active platform Subscription
   */
  accessMethod: "free_post" | "free_credit" | "subscription";

  /**
   * The active Subscription that granted access.
   * Only set when accessMethod === "subscription".
   * Used to verify the read counts toward earnings (subscriber reads only).
   */
  subscriptionId?: mongoose.Types.ObjectId;

  /**
   * Whether the reader held an active subscription at read time.
   * Denormalised flag used by the earnings aggregation pipeline —
   * avoids a join to subscriptions on every monthly calc.
   */
  readerIsSubscriber: boolean;

  /**
   * Seconds the reader spent on the post (updated via heartbeat / on exit).
   * Converted to minutes by the earnings job.
   * Only meaningful for earnings when readerIsSubscriber === true.
   */
  readDurationSeconds: number;

  /**
   * Whether the reader reached the end of the post (scrolled past 80%).
   * Used as a quality signal in the earnings weighting formula.
   */
  completedRead: boolean;

  /** Billing period this read will be counted in (YYYY-MM, e.g. "2025-09") */
  billingPeriod: string;

  createdAt: Date;
  updatedAt: Date;
}

const PostReadSchema = new Schema<IPostRead>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId:    { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    accessMethod: {
      type: String,
      enum: ["free_post", "free_credit", "subscription"],
      required: true,
    },

    subscriptionId:     { type: Schema.Types.ObjectId, ref: "Subscription" },
    readerIsSubscriber: { type: Boolean, default: false, index: true },
    readDurationSeconds:{ type: Number, default: 0, min: 0 },
    completedRead:      { type: Boolean, default: false },
    billingPeriod:      { type: String, required: true, index: true }, // "YYYY-MM"
  },
  { timestamps: true, collection: "post_reads" }
);

/** One read record per user per post (upserted, not duplicated) */
PostReadSchema.index({ userId: 1, postId: 1 }, { unique: true });

/** Earnings job: all subscriber reads for a creator in a billing period */
PostReadSchema.index({ creatorId: 1, billingPeriod: 1, readerIsSubscriber: 1 });

/** Platform-wide billing period totals */
PostReadSchema.index({ billingPeriod: 1, readerIsSubscriber: 1 });

export const PostRead =
  mongoose.models.PostRead ?? mongoose.model<IPostRead>("PostRead", PostReadSchema);
import mongoose, { Schema, Document } from "mongoose";

/**
 * TopicSuggestion Model
 * ---------------------
 * A community wishlist feature gated behind an active platform subscription.
 * Premium subscribers can suggest topics they want creators to write about.
 * Other premium subscribers can upvote suggestions they also want to see.
 * Creators can acknowledge a suggestion, commit to writing it, or decline it.
 * Admins can pin high-quality suggestions or remove inappropriate ones.
 *
 * Access rules (enforced at the application layer):
 *   - Creating a suggestion: requires active Subscription
 *   - Upvoting a suggestion: requires active Subscription
 *   - Viewing suggestions: public (anyone can read the wishlist)
 *   - Responding to a suggestion: requires User.role === "creator"
 *   - Pinning / removing: requires admin or moderator role
 *
 * A suggestion can be:
 *   - General: addressed to all creators on the platform
 *   - Directed: addressed to a specific creator (creatorId is set)
 *
 * Lifecycle:
 *   "open"        → visible, accepting upvotes
 *   "acknowledged"→ a creator has seen it and noted it
 *   "committed"   → a creator has committed to writing on this topic
 *   "fulfilled"   → a post covering this topic has been published (postId set)
 *   "declined"    → creator declined; suggestion closed
 *   "removed"     → removed by admin/moderator for policy violation
 *   "expired"     → no activity for 90 days; auto-closed by background job
 */

export type SuggestionStatus =
  | "open"
  | "acknowledged"
  | "committed"
  | "fulfilled"
  | "declined"
  | "removed"
  | "expired";

export interface ITopicSuggestion extends Document {
  _id: mongoose.Types.ObjectId;

  /** Premium subscriber who made the suggestion */
  suggestedBy: mongoose.Types.ObjectId;

  /**
   * Optional: directed at a specific creator.
   * If null the suggestion is general — any creator can respond.
   */
  creatorId?: mongoose.Types.ObjectId | null;

  /** The suggested topic title */
  title: string;

  /** Optional longer description of what the suggester wants covered */
  description?: string;

  /** Tags to help creators and admins categorise the suggestion */
  tags: string[];

  status: SuggestionStatus;

  /**
   * Upvote count — denormalised for fast sorting.
   * The SuggestionUpvote collection is the source of truth.
   */
  upvotesCount: number;

  /**
   * Creator's response — set when status changes to anything beyond "open".
   */
  creatorResponse?: {
    creatorId:   mongoose.Types.ObjectId;
    message?:    string;
    respondedAt: Date;
  };

  /**
   * If a creator publishes a post fulfilling this suggestion,
   * link it here and set status → "fulfilled".
   */
  fulfilledByPostId?: mongoose.Types.ObjectId;
  fulfilledAt?:       Date;

  /** Admin/moderator pin — floats this suggestion to the top of listings */
  isPinned:   boolean;
  pinnedBy?:  mongoose.Types.ObjectId;
  pinnedAt?:  Date;

  /** Soft-remove by admin/moderator */
  isRemoved:      boolean;
  removedBy?:     mongoose.Types.ObjectId;
  removedAt?:     Date;
  removalReason?: string;

  /**
   * Last activity date — updated when upvoted, responded to, or commented on.
   * Used by the expiry background job (no activity in 90 days → "expired").
   */
  lastActivityAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TopicSuggestionSchema = new Schema<ITopicSuggestion>(
  {
    suggestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    creatorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000, trim: true },
    tags:        { type: [String], default: [], index: true },

    status: {
      type: String,
      enum: ["open","acknowledged","committed","fulfilled","declined","removed","expired"],
      default: "open",
      index: true,
    },

    upvotesCount: { type: Number, default: 0, min: 0 },

    creatorResponse: {
      creatorId:   { type: Schema.Types.ObjectId, ref: "User" },
      message:     { type: String, maxlength: 500 },
      respondedAt: { type: Date },
    },

    fulfilledByPostId: { type: Schema.Types.ObjectId, ref: "Post" },
    fulfilledAt:       { type: Date },

    isPinned:  { type: Boolean, default: false, index: true },
    pinnedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    pinnedAt:  { type: Date },

    isRemoved:      { type: Boolean, default: false },
    removedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    removedAt:      { type: Date },
    removalReason:  { type: String, maxlength: 500 },

    lastActivityAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: "topic_suggestions" }
);

/** Public wishlist feed: open suggestions, pinned first then by upvotes */
TopicSuggestionSchema.index({ status: 1, isPinned: -1, upvotesCount: -1 });

/** Creator's inbox: suggestions directed at them */
TopicSuggestionSchema.index({ creatorId: 1, status: 1, upvotesCount: -1 });

/** Expiry job: open suggestions with no recent activity */
TopicSuggestionSchema.index({ status: 1, lastActivityAt: 1 });

export const TopicSuggestion =
  mongoose.models.TopicSuggestion ??
  mongoose.model<ITopicSuggestion>("TopicSuggestion", TopicSuggestionSchema);

/* ══════════════════════════════════════════════════════════════════════════
   SuggestionUpvote — one upvote per subscriber per suggestion
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Tracks who upvoted what. Drives TopicSuggestion.upvotesCount.
 * Also used to prevent double-upvoting and to show the user
 * which suggestions they have already upvoted.
 *
 * Requires active Subscription at the time of upvote
 * (enforced at the application layer).
 */

export interface ISuggestionUpvote extends Document {
  _id: mongoose.Types.ObjectId;
  suggestionId: mongoose.Types.ObjectId;
  userId:       mongoose.Types.ObjectId;
  createdAt:    Date;
}

const SuggestionUpvoteSchema = new Schema<ISuggestionUpvote>(
  {
    suggestionId: { type: Schema.Types.ObjectId, ref: "TopicSuggestion", required: true, index: true },
    userId:       { type: Schema.Types.ObjectId, ref: "User",            required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "suggestion_upvotes",
  }
);

/** One upvote per user per suggestion */
SuggestionUpvoteSchema.index({ suggestionId: 1, userId: 1 }, { unique: true });

export const SuggestionUpvote =
  mongoose.models.SuggestionUpvote ??
  mongoose.model<ISuggestionUpvote>("SuggestionUpvote", SuggestionUpvoteSchema);
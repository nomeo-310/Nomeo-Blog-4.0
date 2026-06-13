import mongoose, { Schema, Document } from "mongoose";

/**
 * Topic Model
 * -----------
 * The single canonical vocabulary for interests, post tags, and hashtags.
 *
 * Why one collection for all three:
 *   - Reader interests (Profile.interests) and creator topics both need to
 *     match against post tags. If a reader picks "AI" but a creator tags
 *     "Artificial Intelligence", they never connect. One shared list fixes that.
 *   - Onboarding shows a clean, curated picker instead of a free-text box.
 *   - Hashtag / explore pages are driven by real Topic documents with counts.
 *   - Admins can merge duplicates, ban topics, and feature trending ones.
 *
 * How it's used across the app:
 *   - Onboarding interest picker → user selects Topic slugs → stored in
 *     Profile.interests as slugs.
 *   - Creator profile "I write about" → same Topic slugs.
 *   - Post.tags → normalised to Topic slugs on publish (create-on-first-use).
 *   - Feed suggestions → match Profile.interests (reader) against Post.tags.
 *   - Hashtag pages → /topic/[slug] lists posts whose tags include that slug.
 *
 * Topics are seeded by admins for the curated onboarding set, but can also be
 * created on first use when a creator tags a post with a new topic
 * (auto-created with isCurated = false, pending admin review).
 */

export type TopicStatus = "active" | "merged" | "banned";

export interface ITopic extends Document {
  _id: mongoose.Types.ObjectId;

  /** Canonical slug — the stable identifier stored on profiles and posts */
  slug: string;

  /** Human-friendly display label e.g. "Artificial Intelligence" */
  label: string;

  /** Short description shown on the topic/hashtag explore page */
  description?: string;

  /**
   * Alias slugs that resolve to this topic.
   * e.g. ["ai", "a-i", "machine-intelligence"] → "artificial-intelligence"
   * When a post is tagged with an alias, it's normalised to this topic's slug.
   */
  aliases: string[];

  /**
   * Broad grouping for organising the onboarding picker and explore page.
   * e.g. "Technology", "Arts", "Business", "Lifestyle", "Science".
   */
  category?: string;

  /** Optional icon/emoji shown in the onboarding picker */
  icon?: string;

  /**
   * Curated topics appear in the onboarding interest picker and explore page.
   * Auto-created topics (from a creator tagging a new word) start uncurated
   * and await admin review before surfacing in pickers.
   */
  isCurated: boolean;

  status: TopicStatus;

  /**
   * If status is "merged", the slug this topic was merged into.
   * Reads/queries should follow the redirect to mergedInto.
   */
  mergedInto?: string;

  /** Admin who banned this topic and why (status "banned") */
  bannedBy?:     mongoose.Types.ObjectId;
  bannedReason?: string;

  /**
   * Denormalised usage counters — updated by the service layer.
   * Drive "trending topics" and the count shown on explore pages.
   */
  postsCount:      number; // published posts tagged with this topic
  followersCount:  number; // users who have this topic in their interests

  /** Whether admins are highlighting this topic as trending/featured */
  isFeatured: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"],
    },

    label:       { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, maxlength: 500, trim: true },

    aliases:  { type: [String], default: [], index: true },
    category: { type: String, trim: true, maxlength: 60, index: true },
    icon:     { type: String, maxlength: 16 },

    isCurated: { type: Boolean, default: false, index: true },

    status: {
      type: String,
      enum: ["active", "merged", "banned"],
      default: "active",
      index: true,
    },

    mergedInto:   { type: String, trim: true, lowercase: true },
    bannedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    bannedReason: { type: String, maxlength: 300 },

    postsCount:     { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 },

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "topics" }
);

/** Onboarding picker: curated active topics grouped by category */
TopicSchema.index({ isCurated: 1, status: 1, category: 1 });

/** Explore page: trending topics by post count, excluding banned/merged */
TopicSchema.index({ status: 1, postsCount: -1 });

/** Featured topics strip */
TopicSchema.index({ isFeatured: 1, status: 1 });

export const Topic =
  mongoose.models.Topic ?? mongoose.model<ITopic>("Topic", TopicSchema);
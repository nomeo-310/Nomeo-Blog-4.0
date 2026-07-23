import mongoose, { Schema, Document } from "mongoose";

/**
 * SavedPost Model
 * ---------------
 * Any logged-in user OR creator can save any post — their own or someone else's.
 * Saving is the single concept. There is no separate "bookmark" — they are the
 * same action with the same intent: "I want to come back to this later."
 *
 * Drives:
 *   - Post.savesCount  (denormalised counter, incremented/decremented here)
 *   - Profile.savedPostsCount (denormalised counter on the saver's profile)
 *   - The "Saved" reading list on the user's profile page
 *
 * Lists:
 *   Users can organise their saves into named lists (SavedList).
 *   Every account gets a default "Saved" list created during onboarding.
 *   A post can only be saved once per user (unique index), but it can be
 *   moved between lists.
 */

/* ══════════════════════════════════════════════════════════════════════════
   SavedList — named reading list owned by a user
   ══════════════════════════════════════════════════════════════════════════ */

export interface ISavedList extends Document {
  _id: mongoose.Types.ObjectId;

  /** Owner — any role except admin roles */
  userId: mongoose.Types.ObjectId;

  name: string;
  description?: string;

  /** Whether this list is visible on the user's public profile */
  isPublic: boolean;

  /** System flag: the default "Saved" list auto-created on onboarding */
  isDefault: boolean;

  /** Denormalised item count */
  itemsCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const SavedListSchema = new Schema<ISavedList>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300 },
    isPublic:    { type: Boolean, default: false },
    isDefault:   { type: Boolean, default: false },
    itemsCount:  { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "saved_lists" }
);

/** One default list per user */
SavedListSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const SavedList =
  mongoose.models.SavedList ?? mongoose.model<ISavedList>("SavedList", SavedListSchema);

/* ══════════════════════════════════════════════════════════════════════════
   SavedPost — one saved-post record per user per post
   ══════════════════════════════════════════════════════════════════════════ */

export interface ISavedPost extends Document {
  _id: mongoose.Types.ObjectId;

  /** The user who saved the post */
  userId: mongoose.Types.ObjectId;

  /** The post that was saved */
  postId: mongoose.Types.ObjectId;

  /**
   * Which list this save belongs to.
   * Always points to a SavedList owned by this user.
   * Defaults to the user's default list at the application layer.
   */
  listId: mongoose.Types.ObjectId;

  /** Optional private note the saver added to remind themselves why they saved it */
  note?: string;

  createdAt: Date;
}

const SavedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    listId: { type: Schema.Types.ObjectId, ref: "SavedList", required: true, index: true },
    note:   { type: String, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "saved_posts",
  }
);

/** A post can only be saved once per user — moving it between lists is an update */
SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

/** Fetch all saves in a list, newest first */
SavedPostSchema.index({ listId: 1, createdAt: -1 });

export const SavedPost =
  mongoose.models.SavedPost ?? mongoose.model<ISavedPost>("SavedPost", SavedPostSchema);
import mongoose, { Schema, Document } from "mongoose";

/**
 * Profile Model
 * -------------
 * Extended details for every user. Created during onboarding immediately
 * after sign-up, regardless of role.
 *
 * Role clarification (matches User.role from Better Auth):
 *   "user"        → reads posts, comments, follows, can save posts,
 *                   can subscribe to the platform, can upgrade to creator.
 *   "creator"     → everything a user can do PLUS publish posts, own a lounge,
 *                   collaborate on posts, earn from the subscription pool.
 *                   Chosen at sign-up OR upgraded from "user" at any time.
 *   "moderator"   → dashboard role; review reports, moderate content, issue bans.
 *                   Assigned by super_admin.
 *   "admin"       → all moderator permissions + campaigns, user management.
 *                   Assigned by super_admin.
 *   "super_admin" → full platform control; assigns all other roles.
 *
 * User → Creator upgrade:
 *   The service layer sets User.role = "creator" and Profile.creatorStatus = "active"
 *   and Profile.becameCreatorAt = now(). No new Profile document is created —
 *   it is an in-place upgrade on the existing record.
 *
 * creatorStatus (only meaningful when User.role === "creator"):
 *   "active"    → publishing and earning normally
 *   "suspended" → creator privileges revoked; can still read and comment
 *
 * banStatus (applies to all roles):
 *   "active"       → normal access
 *   "banned"       → full platform ban
 *   "shadow_banned" → can post but content is hidden from others
 *
 * Free-read credits:
 *   Subscribers (active Subscription) can read all paid posts freely.
 *   Non-subscribers get 10 free credits on account creation.
 *   Each paid-post read by a non-subscriber costs 1 credit.
 *   Once exhausted, a subscription is required to read paid content.
 */

export type CreatorStatus = "active" | "suspended";
export type BanStatus     = "active" | "banned" | "shadow_banned";
export type Gender        = "male" | "female" | "non_binary" | "prefer_not_to_say";

/**
 * A stored Cloudinary image. We keep public_id so the image can be deleted
 * or replaced later (a bare URL can't be cleaned up), plus the dimensions
 * for layout/aspect handling.
 */
export interface ICloudinaryImage {
  url: string;       // secure_url for display
  publicId: string;  // public_id for delete/replace
  width?: number;
  height?: number;
}

export interface ISocialLinks {
  twitter?:   string;
  linkedin?:  string;
  github?:    string;
  website?:   string;
  instagram?: string;
}

export interface IProfile extends Document {
  _id: mongoose.Types.ObjectId;

  /** Reference to the Better Auth User record */
  userId: mongoose.Types.ObjectId;

  /** Unique public handle e.g. @johndoe */
  username: string;

  /** Name shown on posts and the profile page — distinct from the @handle */
  displayName: string;

  /** Optional pronouns shown on the public profile, e.g. "she/her" */
  pronouns?: string;

  /**
   * Optional gender. Not required, defaults to "prefer_not_to_say".
   * Collected only for optional audience analytics — never shown publicly
   * unless the user opts in. Sensitive data: handle per privacy policy.
   */
  gender?: Gender;

  /**
   * Optional date of birth. Used for age-gating (13+ requirement) only.
   * Never shown publicly.
   */
  dateOfBirth?: Date;

  bio?:        string;
  about?:      string;

  /**
   * Profile picture. Stored as an object so we keep the Cloudinary public_id
   * (needed to delete/replace the old image) alongside the display URL.
   * Null when the user hasn't uploaded one — the UI falls back to the
   * initial-letter avatar.
   */
  profileImage?: ICloudinaryImage | null;

  /**
   * Cover/banner image — creators only in practice, but the field exists for
   * all profiles. Wide aspect ratio. Same object shape as profileImage.
   */
  coverImage?: ICloudinaryImage | null;

  location?:   string;
  occupation?: string;
  socialLinks?: ISocialLinks;

  /**
   * Only set when User.role === "creator".
   * null for users, moderators, admins.
   */
  creatorStatus?:           CreatorStatus | null;
  creatorSuspensionReason?: string;
  creatorSuspendedBy?:      mongoose.Types.ObjectId;
  creatorSuspendedAt?:      Date;

  /**
   * When User.role was changed from "user" to "creator".
   * null if the account was created directly as a creator.
   */
  becameCreatorAt?: Date | null;

  banStatus:    BanStatus;
  banReason?:   string;
  bannedBy?:    mongoose.Types.ObjectId;
  bannedAt?:    Date;
  banExpiresAt?: Date;

  /**
   * Free-read credits remaining.
   * Only relevant for non-subscribers (no active Subscription).
   * Decremented when a non-subscriber reads a paid post.
   * Creators, admins, and moderators are not subject to this limit.
   */
  freeReadsRemaining: number;

  onboardingCompleted: boolean;
  onboardingStep:      number;

  /** Denormalised counters */
  postsCount:     number;  // creator only
  followersCount: number;
  followingCount: number;
  savedPostsCount: number; // total posts saved by this user

  /**
   * Reader interests — an array of Topic slugs (see topic.ts).
   * Chosen during onboarding from the curated Topic picker.
   * Drives feed suggestions and which hashtags/topics surface to this user.
   */
  interests: string[];

  /**
   * Creator's declared topics — an array of Topic slugs.
   * Only meaningful when User.role === "creator".
   * Shown on the public profile as "Writes about: …" so readers know what
   * to expect, and used to suggest the creator to readers with matching interests.
   */
  creatorTopics: string[];

  isPublic: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    twitter:   { type: String, trim: true },
    linkedin:  { type: String, trim: true },
    github:    { type: String, trim: true },
    website:   { type: String, trim: true },
    instagram: { type: String, trim: true },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
      match: [/^[a-z0-9_]+$/, "Username may only contain letters, numbers and underscores"],
    },

    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    pronouns:    { type: String, trim: true, maxlength: 30 },
    gender: {
      type: String,
      enum: ["male", "female", "non_binary", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    dateOfBirth: { type: Date },

    bio:         { type: String, maxlength: 500, trim: true },
    about:       { type: String, maxlength: 5000, trim: true },
    profileImage: {
      type: {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
        width:    { type: Number },
        height:   { type: Number },
      },
      default: null,
    },
    coverImage: {
      type: {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
        width:    { type: Number },
        height:   { type: Number },
      },
      default: null,
    },
    location:    { type: String, maxlength: 100, trim: true },
    occupation:  { type: String, maxlength: 100, trim: true },
    socialLinks: { type: SocialLinksSchema, default: () => ({}) },

    creatorStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: null,
    },
    creatorSuspensionReason: { type: String, trim: true, maxlength: 500 },
    creatorSuspendedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    creatorSuspendedAt:      { type: Date },
    becameCreatorAt:         { type: Date, default: null },

    banStatus: {
      type: String,
      enum: ["active", "banned", "shadow_banned"],
      default: "active",
      index: true,
    },
    banReason:    { type: String, trim: true },
    bannedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    bannedAt:     { type: Date },
    banExpiresAt: { type: Date },

    freeReadsRemaining: { type: Number, default: 10, min: 0 },

    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep:      { type: Number,  default: 0 },

    postsCount:      { type: Number, default: 0, min: 0 },
    followersCount:  { type: Number, default: 0, min: 0 },
    followingCount:  { type: Number, default: 0, min: 0 },
    savedPostsCount: { type: Number, default: 0, min: 0 },

    interests: { type: [String], default: [] },
    creatorTopics: { type: [String], default: [] },
    isPublic:  { type: Boolean, default: true },
  },
  { timestamps: true, collection: "profiles" }
);

ProfileSchema.index({ banStatus: 1, creatorStatus: 1 });

export const Profile =
  mongoose.models.Profile ?? mongoose.model<IProfile>("Profile", ProfileSchema);
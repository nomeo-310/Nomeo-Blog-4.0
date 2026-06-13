import mongoose, { Schema, Document } from "mongoose";

/**
 * Setting Model
 * -------------
 * Per-user configurable preferences. One document per user,
 * created automatically during onboarding.
 *
 * Role notes:
 *   - All roles (user, creator, moderator, admin, super_admin) get a settings doc.
 *   - The `creator` preference group only applies when User.role === "creator".
 *   - Newsletter sending is an admin function — no newsletter prefs here.
 *   - Admin/moderator dashboard preferences are intentionally minimal;
 *     dashboard config belongs in a separate admin-settings store.
 */

export interface INotificationPreferences {
  emailNewFollower:        boolean;
  emailFollowRequest:      boolean;
  emailNewComment:         boolean;
  emailCommentReply:       boolean;
  emailNewPost:            boolean; // from creators/users you follow
  emailLoungeActivity:     boolean; // new messages in lounges you're in
  emailSubscriptionAlerts: boolean;
  emailFreeReadsLow:       boolean;
  emailAccountAlerts:      boolean; // bans, warnings

  pushNewFollower:         boolean;
  pushFollowRequest:       boolean;
  pushNewComment:          boolean;
  pushCommentReply:        boolean;
  pushNewPost:             boolean;
  pushLoungeMessage:       boolean;
  pushLoungeMention:       boolean;
  pushSubscriptionAlerts:  boolean;
}

export interface IPrivacyPreferences {
  /** Who can send a follow request */
  whoCanFollow:              "everyone" | "no_one";
  showInSearch:              boolean;
  showReadingActivity:       boolean;
  allowDmsFromNonFollowers:  boolean;
}

export interface IAppearancePreferences {
  theme:            "light" | "dark" | "system";
  fontSize:         "sm" | "md" | "lg" | "xl";
  contentLanguages: string[];
}

/**
 * Creator-specific preferences.
 * Only meaningful when User.role === "creator".
 */
export interface ICreatorPreferences {
  /** Default access level for newly created posts */
  defaultPostAccess: "free" | "paid";

  /**
   * Whether co-author invitations are open to all circle members
   * or require an additional manual approval step.
   */
  openCoAuthorInvites: boolean;

  /**
   * Whether the creator's lounge requires manual approval of member requests
   * (always true — included here in case the creator wants to auto-accept
   * in a future feature flag).
   */
  loungeAutoAcceptMembers: boolean;
}

export interface ISetting extends Document {
  _id: mongoose.Types.ObjectId;

  userId: mongoose.Types.ObjectId;

  notifications: INotificationPreferences;
  privacy:       IPrivacyPreferences;
  appearance:    IAppearancePreferences;
  creator:       ICreatorPreferences;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    emailNewFollower:        { type: Boolean, default: true },
    emailFollowRequest:      { type: Boolean, default: true },
    emailNewComment:         { type: Boolean, default: true },
    emailCommentReply:       { type: Boolean, default: true },
    emailNewPost:            { type: Boolean, default: true },
    emailLoungeActivity:     { type: Boolean, default: false },
    emailSubscriptionAlerts: { type: Boolean, default: true },
    emailFreeReadsLow:       { type: Boolean, default: true },
    emailAccountAlerts:      { type: Boolean, default: true },

    pushNewFollower:         { type: Boolean, default: true },
    pushFollowRequest:       { type: Boolean, default: true },
    pushNewComment:          { type: Boolean, default: true },
    pushCommentReply:        { type: Boolean, default: true },
    pushNewPost:             { type: Boolean, default: true },
    pushLoungeMessage:       { type: Boolean, default: true },
    pushLoungeMention:       { type: Boolean, default: true },
    pushSubscriptionAlerts:  { type: Boolean, default: true },
  },
  { _id: false }
);

const PrivacyPreferencesSchema = new Schema<IPrivacyPreferences>(
  {
    whoCanFollow:             { type: String, enum: ["everyone", "no_one"], default: "everyone" },
    showInSearch:             { type: Boolean, default: true },
    showReadingActivity:      { type: Boolean, default: false },
    allowDmsFromNonFollowers: { type: Boolean, default: true },
  },
  { _id: false }
);

const AppearancePreferencesSchema = new Schema<IAppearancePreferences>(
  {
    theme:            { type: String, enum: ["light", "dark", "system"], default: "system" },
    fontSize:         { type: String, enum: ["sm", "md", "lg", "xl"],    default: "md" },
    contentLanguages: { type: [String], default: ["en"] },
  },
  { _id: false }
);

const CreatorPreferencesSchema = new Schema<ICreatorPreferences>(
  {
    defaultPostAccess:       { type: String, enum: ["free", "paid"], default: "free" },
    openCoAuthorInvites:     { type: Boolean, default: true },
    loungeAutoAcceptMembers: { type: Boolean, default: false },
  },
  { _id: false }
);

const SettingSchema = new Schema<ISetting>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    notifications: { type: NotificationPreferencesSchema, default: () => ({}) },
    privacy:       { type: PrivacyPreferencesSchema,      default: () => ({}) },
    appearance:    { type: AppearancePreferencesSchema,   default: () => ({}) },
    creator:       { type: CreatorPreferencesSchema,      default: () => ({}) },
  },
  { timestamps: true, collection: "settings" }
);

export const Setting =
  mongoose.models.Setting ?? mongoose.model<ISetting>("Setting", SettingSchema);
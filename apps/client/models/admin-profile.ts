import mongoose, { Schema, Document } from "mongoose";

/**
 * AdminProfile Model
 * ------------------
 * Operational record for moderator, admin, and super_admin roles.
 * Never exposed through the public API — dashboard only.
 *
 * Admin roles have NO Profile document (that is for users and creators).
 * Role lives on User.role (Better Auth). AdminProfile holds everything
 * else the dashboard needs: permissions, department, activity stats, 2FA.
 */

export type AdminRole   = "moderator" | "admin" | "super_admin";
export type AdminStatus = "active" | "suspended" | "removed";

export interface IAdminPermissions {
  canPublishPost:            boolean;
  canRemovePost:             boolean;
  canRestorePost:            boolean;
  canFeaturePost:            boolean;
  canRemoveComment:          boolean;
  canRestoreComment:         boolean;
  canViewUsers:              boolean;
  canIssueTempBan:           boolean;
  canIssuePermanentBan:      boolean;
  canLiftBan:                boolean;
  canShadowBan:              boolean;
  canIssueWarning:           boolean;
  canDeleteUserAccount:      boolean;
  canSuspendCreator:         boolean;
  canReinstateCreator:       boolean;
  canInviteModerator:        boolean;
  canInviteAdmin:            boolean;
  canRevokeAdminRole:        boolean;
  canCreateCampaign:         boolean;
  canSendCampaign:           boolean;
  canViewCampaignStats:      boolean;
  canManagePlatformSettings: boolean;
  canManageTags:             boolean;
  canViewEarningsReports:    boolean;
  canManagePayouts:          boolean;
  canSuspendLounge:          boolean;
  canRemoveLoungeMessage:    boolean;
  canViewAuditLog:           boolean;
  canViewErrorLog:           boolean;
  canExportLogs:             boolean;
}

export interface IAdminProfile extends Document {
  _id: mongoose.Types.ObjectId;

  /** References the Better Auth User record */
  userId: mongoose.Types.ObjectId;

  role:   AdminRole;
  status: AdminStatus;

  /** Who assigned this role (null = seeded super_admin) */
  assignedBy?: mongoose.Types.ObjectId | null;
  assignedAt:  Date;

  suspendedBy?:      mongoose.Types.ObjectId;
  suspendedAt?:      Date;
  suspensionReason?: string;

  removedBy?:    mongoose.Types.ObjectId;
  removedAt?:    Date;
  removalReason?: string;

  permissions: IAdminPermissions;

  /** Internal name shown in the dashboard — not public */
  displayName: string;

  department: "content" | "trust_and_safety" | "growth" | "engineering" | "support" | "other";

  /** Visible to super_admins only */
  internalNotes?: string;

  lastActiveAt?: Date;

  /** Required for admin and super_admin; optional for moderator */
  twoFactorEnabled:     boolean;
  twoFactorVerifiedAt?: Date;

  stats: {
    reportsReviewed: number;
    bansIssued:      number;
    postsRemoved:    number;
    postsPublished:  number;
    warningsIssued:  number;
    campaignsSent:   number;
  };

  dashboardNotifications: {
    emailOnEscalatedReport: boolean;
    emailOnNewBanAppeal:    boolean;
    emailOnCampaignFailure: boolean;
    emailOnPayoutFailure:   boolean;
    inAppOnNewReport:       boolean;
    inAppOnCriticalError:   boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const AdminPermissionsSchema = new Schema<IAdminPermissions>(
  {
    canPublishPost:            { type: Boolean, default: true  },
    canRemovePost:             { type: Boolean, default: true  },
    canRestorePost:            { type: Boolean, default: true  },
    canFeaturePost:            { type: Boolean, default: false },
    canRemoveComment:          { type: Boolean, default: true  },
    canRestoreComment:         { type: Boolean, default: true  },
    canViewUsers:              { type: Boolean, default: true  },
    canIssueTempBan:           { type: Boolean, default: true  },
    canIssuePermanentBan:      { type: Boolean, default: false },
    canLiftBan:                { type: Boolean, default: true  },
    canShadowBan:              { type: Boolean, default: true  },
    canIssueWarning:           { type: Boolean, default: true  },
    canDeleteUserAccount:      { type: Boolean, default: false },
    canSuspendCreator:         { type: Boolean, default: false },
    canReinstateCreator:       { type: Boolean, default: false },
    canInviteModerator:        { type: Boolean, default: false },
    canInviteAdmin:            { type: Boolean, default: false },
    canRevokeAdminRole:        { type: Boolean, default: false },
    canCreateCampaign:         { type: Boolean, default: false },
    canSendCampaign:           { type: Boolean, default: false },
    canViewCampaignStats:      { type: Boolean, default: true  },
    canManagePlatformSettings: { type: Boolean, default: false },
    canManageTags:             { type: Boolean, default: false },
    canViewEarningsReports:    { type: Boolean, default: false },
    canManagePayouts:          { type: Boolean, default: false },
    canSuspendLounge:          { type: Boolean, default: true  },
    canRemoveLoungeMessage:    { type: Boolean, default: true  },
    canViewAuditLog:           { type: Boolean, default: true  },
    canViewErrorLog:           { type: Boolean, default: false },
    canExportLogs:             { type: Boolean, default: false },
  },
  { _id: false }
);

const AdminProfileSchema = new Schema<IAdminProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    role:   { type: String, enum: ["moderator","admin","super_admin"], required: true, index: true },
    status: { type: String, enum: ["active","suspended","removed"],   default: "active", index: true },

    assignedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date, required: true, default: () => new Date() },

    suspendedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    suspendedAt:      { type: Date },
    suspensionReason: { type: String, maxlength: 500 },

    removedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    removedAt:     { type: Date },
    removalReason: { type: String, maxlength: 500 },

    permissions: { type: AdminPermissionsSchema, default: () => ({}) },

    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    department: {
      type: String,
      enum: ["content","trust_and_safety","growth","engineering","support","other"],
      default: "content",
    },
    internalNotes: { type: String, maxlength: 2000 },

    lastActiveAt:        { type: Date },
    twoFactorEnabled:    { type: Boolean, default: false },
    twoFactorVerifiedAt: { type: Date },

    stats: {
      reportsReviewed: { type: Number, default: 0, min: 0 },
      bansIssued:      { type: Number, default: 0, min: 0 },
      postsRemoved:    { type: Number, default: 0, min: 0 },
      postsPublished:  { type: Number, default: 0, min: 0 },
      warningsIssued:  { type: Number, default: 0, min: 0 },
      campaignsSent:   { type: Number, default: 0, min: 0 },
    },

    dashboardNotifications: {
      emailOnEscalatedReport: { type: Boolean, default: true },
      emailOnNewBanAppeal:    { type: Boolean, default: true },
      emailOnCampaignFailure: { type: Boolean, default: true },
      emailOnPayoutFailure:   { type: Boolean, default: true },
      inAppOnNewReport:       { type: Boolean, default: true },
      inAppOnCriticalError:   { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: "admin_profiles" }
);

AdminProfileSchema.index({ role: 1, status: 1 });

export const AdminProfile =
  mongoose.models.AdminProfile ??
  mongoose.model<IAdminProfile>("AdminProfile", AdminProfileSchema);
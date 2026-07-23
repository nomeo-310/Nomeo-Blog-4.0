// models/admin.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * Admin model — single operational record for every admin account.
 *
 * Roles:
 *   moderator   — content moderation only (limited permissions)
 *   admin       — full moderation + campaigns + user management
 *   super_admin — everything, bypasses all permission checks
 *
 * Permissions are stored per-admin so individual moderators can have
 * custom access without changing their role. super_admin bypasses
 * all permission checks in authorization.ts.
 *
 * Stats are incremented server-side on each action — never client-side.
 */

export type AdminRole   = "support" | "admin" | "super_admin";
export type AdminStatus = "active" | "suspended" | "inactive";

export interface IAdminPermissions {
  // Post moderation
  canRemovePost:             boolean;
  canRestorePost:            boolean;
  canFeaturePost:            boolean;
  // Comment moderation
  canRemoveComment:          boolean;
  canRestoreComment:         boolean;
  // User management
  canViewUsers:              boolean;
  canIssueTempBan:           boolean;
  canIssuePermanentBan:      boolean;
  canLiftBan:                boolean;
  canShadowBan:              boolean;
  canIssueWarning:           boolean;
  canDeleteUserAccount:      boolean;
  // Creator management
  canApproveCreatorApplication: boolean;
  canRejectCreatorApplication:  boolean;
  // Lounge moderation
  canSuspendLounge:          boolean;
  canDeleteLounge:           boolean;
  canRemoveLoungeMessage:    boolean;
  // Campaigns & newsletters
  canCreateCampaign:         boolean;
  canSendCampaign:           boolean;
  canViewCampaignStats:      boolean;
  // Admin management (super_admin only in practice)
  canInviteAdmin:            boolean;
  canRevokeAdminRole:        boolean;
  // Platform
  canManagePlatformSettings: boolean;
  canManageTags:             boolean;
  canViewEarningsReports:    boolean;
  canManagePayouts:          boolean;
  // Logs
  canViewAuditLog:           boolean;
  canViewErrorLog:           boolean;
  canExportLogs:             boolean;
}

export interface IAdminStats {
  bansIssued:       number;
  bansLifted:       number;
  postsRemoved:     number;
  postsRestored:    number;
  commentsRemoved:  number;
  warningsIssued:   number;
  campaignsSent:    number;
  loungeSuspended:  number;
  creatorsApproved: number;
  creatorsRejected: number;
}

export interface IDashboardNotifications {
  emailOnEscalatedReport: boolean;
  emailOnNewBanAppeal:    boolean;
  emailOnCampaignFailure: boolean;
  emailOnPayoutFailure:   boolean;
}

export interface IAdmin extends Document {
  // ── Identity ──────────────────────────────────────────────────────
  name:         string;
  displayName?: string;
  userId:       mongoose.Types.ObjectId;
  email:        string;

  // ── Role & status ─────────────────────────────────────────────────
  role:         AdminRole;
  adminStatus:  AdminStatus;
  isActive:     boolean;
  isOnboarded:  boolean;

  // ── Auth ──────────────────────────────────────────────────────────
  useSeedPhrase:  boolean;
  lastLoginAt?:   Date;
  lastLoginIP?:   string;
  loginCount:     number;

  // ── Permissions ───────────────────────────────────────────────────
  permissions: IAdminPermissions;

  // ── Context ───────────────────────────────────────────────────────
  department: "content" | "trust_and_safety" | "growth" | "engineering" | "support" | "other";
  /** Only visible to super_admins */
  internalNotes?: string;

  /** Which super_admin invited this admin (null = seeded) */
  assignedBy?:  mongoose.Types.ObjectId | null;
  assignedAt?:  Date;

  // ── Suspension ────────────────────────────────────────────────────
  suspendedBy?:      mongoose.Types.ObjectId;
  suspendedAt?:      Date;
  suspensionReason?: string;

  // ── Activity stats ────────────────────────────────────────────────
  stats: IAdminStats;

  // ── Dashboard notification preferences ────────────────────────────
  dashboardNotifications: IDashboardNotifications;

  // ── Timestamps ────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

/* ── Permission defaults per role ───────────────────────────────────────── */

export function defaultPermissions(role: AdminRole): IAdminPermissions {
  const support: IAdminPermissions = {
    canRemovePost:                true,
    canRestorePost:               true,
    canFeaturePost:               false,
    canRemoveComment:             true,
    canRestoreComment:            true,
    canViewUsers:                 true,
    canIssueTempBan:              true,
    canIssuePermanentBan:         false,
    canLiftBan:                   false,
    canShadowBan:                 false,
    canIssueWarning:              true,
    canDeleteUserAccount:         false,
    canApproveCreatorApplication: false,
    canRejectCreatorApplication:  false,
    canSuspendLounge:             true,
    canDeleteLounge:              false,
    canRemoveLoungeMessage:       true,
    canCreateCampaign:            false,
    canSendCampaign:              false,
    canViewCampaignStats:         false,
    canInviteAdmin:               false,
    canRevokeAdminRole:           false,
    canManagePlatformSettings:    false,
    canManageTags:                false,
    canViewEarningsReports:       false,
    canManagePayouts:             false,
    canViewAuditLog:              false,
    canViewErrorLog:              false,
    canExportLogs:                false,
  };

  const admin: IAdminPermissions = {
    ...support,
    canFeaturePost:               true,
    canIssuePermanentBan:         true,
    canLiftBan:                   true,
    canShadowBan:                 true,
    canDeleteUserAccount:         true,
    canApproveCreatorApplication: true,
    canRejectCreatorApplication:  true,
    canDeleteLounge:              true,
    canCreateCampaign:            true,
    canSendCampaign:              true,
    canViewCampaignStats:         true,
    canManageTags:                true,
    canViewEarningsReports:       true,
    canViewAuditLog:              true,
    canViewErrorLog:              true,
  };

  const superAdmin: IAdminPermissions = {
    ...admin,
    canInviteAdmin:            true,
    canRevokeAdminRole:        true,
    canManagePlatformSettings: true,
    canManagePayouts:          true,
    canExportLogs:             true,
  };

  if (role === "super_admin") return superAdmin;
  if (role === "admin")       return admin;
  return support;
}

/* ── Sub-schemas ────────────────────────────────────────────────────────── */

const PermissionsSchema = new Schema<IAdminPermissions>(
  {
    canRemovePost:                { type: Boolean, default: false },
    canRestorePost:               { type: Boolean, default: false },
    canFeaturePost:               { type: Boolean, default: false },
    canRemoveComment:             { type: Boolean, default: false },
    canRestoreComment:            { type: Boolean, default: false },
    canViewUsers:                 { type: Boolean, default: false },
    canIssueTempBan:              { type: Boolean, default: false },
    canIssuePermanentBan:         { type: Boolean, default: false },
    canLiftBan:                   { type: Boolean, default: false },
    canShadowBan:                 { type: Boolean, default: false },
    canIssueWarning:              { type: Boolean, default: false },
    canDeleteUserAccount:         { type: Boolean, default: false },
    canApproveCreatorApplication: { type: Boolean, default: false },
    canRejectCreatorApplication:  { type: Boolean, default: false },
    canSuspendLounge:             { type: Boolean, default: false },
    canDeleteLounge:              { type: Boolean, default: false },
    canRemoveLoungeMessage:       { type: Boolean, default: false },
    canCreateCampaign:            { type: Boolean, default: false },
    canSendCampaign:              { type: Boolean, default: false },
    canViewCampaignStats:         { type: Boolean, default: false },
    canInviteAdmin:               { type: Boolean, default: false },
    canRevokeAdminRole:           { type: Boolean, default: false },
    canManagePlatformSettings:    { type: Boolean, default: false },
    canManageTags:                { type: Boolean, default: false },
    canViewEarningsReports:       { type: Boolean, default: false },
    canManagePayouts:             { type: Boolean, default: false },
    canViewAuditLog:              { type: Boolean, default: false },
    canViewErrorLog:              { type: Boolean, default: false },
    canExportLogs:                { type: Boolean, default: false },
  },
  { _id: false }
);

const StatsSchema = new Schema<IAdminStats>(
  {
    bansIssued:       { type: Number, default: 0 },
    bansLifted:       { type: Number, default: 0 },
    postsRemoved:     { type: Number, default: 0 },
    postsRestored:    { type: Number, default: 0 },
    commentsRemoved:  { type: Number, default: 0 },
    warningsIssued:   { type: Number, default: 0 },
    campaignsSent:    { type: Number, default: 0 },
    loungeSuspended:  { type: Number, default: 0 },
    creatorsApproved: { type: Number, default: 0 },
    creatorsRejected: { type: Number, default: 0 },
  },
  { _id: false }
);

const DashboardNotificationsSchema = new Schema<IDashboardNotifications>(
  {
    emailOnEscalatedReport: { type: Boolean, default: true  },
    emailOnNewBanAppeal:    { type: Boolean, default: true  },
    emailOnCampaignFailure: { type: Boolean, default: true  },
    emailOnPayoutFailure:   { type: Boolean, default: false },
  },
  { _id: false }
);

/* ── Main schema ────────────────────────────────────────────────────────── */

const AdminSchema = new Schema<IAdmin>(
  {
    // ── Identity
    name:        { type: String },
    displayName: { type: String },
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },

    // ── Role & status
    role:        { type: String, enum: ["support", "admin", "super_admin"], default: "support" },
    adminStatus: { type: String, enum: ["active", "suspended", "inactive"], default: "active" },
    isActive:    { type: Boolean, default: true  },
    isOnboarded: { type: Boolean, default: false },

    // ── Auth
    useSeedPhrase: { type: Boolean, default: true },
    lastLoginAt:   { type: Date },
    lastLoginIP:   { type: String },
    loginCount:    { type: Number, default: 0 },

    // ── Permissions
    permissions: { type: PermissionsSchema, default: () => defaultPermissions("support") },

    // ── Context
    department: {
      type:    String,
      enum:    ["content", "trust_and_safety", "growth", "engineering", "support", "other"],
      default: "other",
    },
    internalNotes: { type: String },
    assignedBy:    { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    assignedAt:    { type: Date },

    // ── Suspension
    suspendedBy:       { type: Schema.Types.ObjectId, ref: "Admin" },
    suspendedAt:       { type: Date },
    suspensionReason:  { type: String },

    // ── Stats
    stats: { type: StatsSchema, default: () => ({}) },

    // ── Dashboard notification preferences
    dashboardNotifications: { type: DashboardNotificationsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "admins" }
);

/* ── Indexes ────────────────────────────────────────────────────────────── */

AdminSchema.index({ role: 1, adminStatus: 1 });
AdminSchema.index({ email: 1 });

/* ── Export ─────────────────────────────────────────────────────────────── */

export const Admin =
  mongoose.models.Admin ?? mongoose.model<IAdmin>("Admin", AdminSchema);
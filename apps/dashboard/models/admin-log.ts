// models/admin-log.ts
import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * AdminLog — audit trail for all admin actions on the Nomeo platform.
 *
 * Every action an admin takes is recorded here with full context:
 * who did it, what they did, what was affected, from where, and whether
 * it succeeded. Critical and warning actions are flagged for easy filtering.
 *
 * Static methods provide common query patterns so route handlers stay clean.
 */

// ── Actions ────────────────────────────────────────────────────────────────

export enum AdminAction {
  // Authentication
  LOGIN                   = "login",
  LOGOUT                  = "logout",
  FAILED_LOGIN            = "failed_login",
  PASSWORD_CHANGE         = "password_change",
  UPDATE_SEED_PHRASE      = "update_seed_phrase",
  VALIDATE_SEED_PHRASE    = "validate_seed_phrase",

  // User management
  BAN_USER                = "ban_user",
  UNBAN_USER              = "unban_user",
  WARN_USER               = "warn_user",
  DELETE_USER             = "delete_user",
  RESTORE_USER            = "restore_user",
  UPDATE_USER_ROLE        = "update_user_role",
  VERIFY_USER             = "verify_user",

  // Creator management
  APPROVE_CREATOR_APPLICATION = "approve_creator_application",
  REJECT_CREATOR_APPLICATION  = "reject_creator_application",
  SUSPEND_CREATOR             = "suspend_creator",
  REINSTATE_CREATOR           = "reinstate_creator",
  DEMOTE_CREATOR              = "demote_creator",
  HOLD_CREATOR_PAYOUT         = "hold_creator_payout",
  RELEASE_CREATOR_PAYOUT      = "release_creator_payout",
  MARK_PAYOUT_PAID            = "mark_payout_paid",

  // Post moderation
  REMOVE_POST             = "remove_post",
  RESTORE_POST            = "restore_post",
  FEATURE_POST            = "feature_post",
  UNFEATURE_POST          = "unfeature_post",
  CHANGE_POST_ACCESS      = "change_post_access",
  HARD_DELETE_POST        = "hard_delete_post",

  // Comment moderation
  REMOVE_COMMENT          = "remove_comment",
  RESTORE_COMMENT         = "restore_comment",

  // Report moderation
  REVIEW_REPORT           = "review_report",
  DISMISS_REPORT          = "dismiss_report",
  ESCALATE_REPORT         = "escalate_report",

  // Lounge moderation
  CREATE_LOUNGE           = "create_lounge",
  SUSPEND_LOUNGE          = "suspend_lounge",
  RESTORE_LOUNGE          = "restore_lounge",
  DELETE_LOUNGE           = "delete_lounge",
  REMOVE_LOUNGE_MESSAGE   = "remove_lounge_message",
  RESTORE_LOUNGE_MESSAGE  = "restore_lounge_message",
  BAN_LOUNGE_MEMBER       = "ban_lounge_member",
  UNBAN_LOUNGE_MEMBER     = "unban_lounge_member",

  // Advert management
  CREATE_ADVERT           = "create_advert",
  UPDATE_ADVERT           = "update_advert",
  APPROVE_ADVERT          = "approve_advert",
  REJECT_ADVERT           = "reject_advert",
  PAUSE_ADVERT            = "pause_advert",
  RESUME_ADVERT           = "resume_advert",
  COMPLETE_ADVERT         = "complete_advert",
  DELETE_ADVERT           = "delete_advert",

  // Subscription & plan management
  CREATE_PLAN             = "create_plan",
  UPDATE_PLAN             = "update_plan",
  DELETE_PLAN             = "delete_plan",
  CANCEL_SUBSCRIPTION     = "cancel_subscription",

  // Payments
  ISSUE_REFUND            = "issue_refund",

  // System
  CLEAR_CACHE             = "clear_cache",
  UPDATE_SETTINGS         = "update_settings",
  EXPORT_DATA             = "export_data",
  SEND_ANNOUNCEMENT       = "send_announcement",
  BLOCK_IP                = "block_ip",
  UNBLOCK_IP              = "unblock_ip",

  // Admin management (super_admin only)
  CREATE_ADMIN            = "create_admin",
  UPDATE_ADMIN            = "update_admin",
  UPDATE_ADMIN_ROLE       = "update_admin_role",
  SUSPEND_ADMIN           = "suspend_admin",
  ACTIVATE_ADMIN          = "activate_admin",
  DELETE_ADMIN            = "delete_admin",
  REVOKE_ADMIN_INVITE     = "revoke_admin_invite",
}

// ── Supporting enums ───────────────────────────────────────────────────────

export enum AdminLogSeverity {
  INFO     = "info",
  WARNING  = "warning",
  ERROR    = "error",
  CRITICAL = "critical",
}

export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN       = "admin",
  SUPPORT     = "support",
}

export const TargetTypes = [
  "user",
  "post",
  "comment",
  "lounge",
  "lounge_message",
  "plan",
  "subscription",
  "payment",
  "creator_application",
  "advert",
  "earning",
  "system",
  "admin",
] as const;
export type TargetType = (typeof TargetTypes)[number];

export const ActionCategories = [
  "authentication",
  "user_management",
  "creator_management",
  "post_moderation",
  "comment_moderation",
  "lounge_moderation",
  "advert_management",
  "subscription_management",
  "payment_management",
  "system_settings",
  "security",
  "admin_management",
] as const;
export type ActionCategory = (typeof ActionCategories)[number];

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface IAdminLog {
  adminId:        mongoose.Types.ObjectId;
  adminEmail:     string;
  adminName:      string;
  adminRole:      AdminRole;
  action:         AdminAction;
  actionCategory: ActionCategory;
  severity:       AdminLogSeverity;
  details:        string;
  targetType?:    TargetType;
  targetId?:      mongoose.Types.ObjectId;
  targetName?:    string;
  changes?:       { field: string; oldValue?: any; newValue?: any }[];
  ipAddress:      string;
  userAgent?:     string;
  endpoint?:      string;
  method?:        string;
  reason?:        string;
  status:         "success" | "failed" | "partial";
  errorMessage?:  string;
  reversible:     boolean;
  revertedAt?:    Date;
  revertedBy?:    mongoose.Types.ObjectId;
  reversionReason?: string;
  metadata:       Map<string, any>;
  affectedCount?: number;
  duration?:      number;
  createdAt:      Date;
}

export interface IAdminLogDocument extends IAdminLog, Document {}

interface CreateAdminLogParams {
  adminId:        string;
  adminEmail:     string;
  adminName:      string;
  adminRole:      AdminRole;
  action:         AdminAction;
  actionCategory?: ActionCategory;
  severity?:      AdminLogSeverity;
  details:        string;
  targetType?:    TargetType;
  targetId?:      string;
  targetName?:    string;
  changes?:       { field: string; oldValue?: any; newValue?: any }[];
  ipAddress:      string;
  userAgent?:     string;
  endpoint?:      string;
  method?:        string;
  reason?:        string;
  status?:        "success" | "failed" | "partial";
  errorMessage?:  string;
  reversible?:    boolean;
  affectedCount?: number;
  duration?:      number;
  metadata?:      Record<string, any>;
}

interface IAdminLogModel extends Model<IAdminLogDocument> {
  logAction(params: CreateAdminLogParams): Promise<IAdminLogDocument>;
  getRecentActions(limit?: number, category?: ActionCategory): Promise<IAdminLogDocument[]>;
  getActionsByAdmin(adminId: string, limit?: number): Promise<IAdminLogDocument[]>;
  getActionsByTarget(targetType: TargetType, targetId: string): Promise<IAdminLogDocument[]>;
  getSecurityEvents(limit?: number): Promise<IAdminLogDocument[]>;
  getActionStats(startDate: Date, endDate: Date): Promise<any>;
  revertAction(logId: string, adminId: string, reason: string): Promise<IAdminLogDocument>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getActionCategory(action: AdminAction): ActionCategory {
  const map: Record<AdminAction, ActionCategory> = {
    // Authentication
    [AdminAction.LOGIN]:                "authentication",
    [AdminAction.LOGOUT]:               "authentication",
    [AdminAction.FAILED_LOGIN]:         "authentication",
    [AdminAction.PASSWORD_CHANGE]:      "authentication",
    [AdminAction.UPDATE_SEED_PHRASE]:   "authentication",
    [AdminAction.VALIDATE_SEED_PHRASE]: "authentication",

    // User management
    [AdminAction.BAN_USER]:             "user_management",
    [AdminAction.UNBAN_USER]:           "user_management",
    [AdminAction.WARN_USER]:            "user_management",
    [AdminAction.DELETE_USER]:          "user_management",
    [AdminAction.RESTORE_USER]:         "user_management",
    [AdminAction.UPDATE_USER_ROLE]:     "user_management",
    [AdminAction.VERIFY_USER]:          "user_management",

    // Creator management
    [AdminAction.APPROVE_CREATOR_APPLICATION]: "creator_management",
    [AdminAction.REJECT_CREATOR_APPLICATION]:  "creator_management",
    [AdminAction.SUSPEND_CREATOR]:             "creator_management",
    [AdminAction.REINSTATE_CREATOR]:           "creator_management",
    [AdminAction.DEMOTE_CREATOR]:              "creator_management",
    [AdminAction.HOLD_CREATOR_PAYOUT]:         "creator_management",
    [AdminAction.RELEASE_CREATOR_PAYOUT]:      "creator_management",
    [AdminAction.MARK_PAYOUT_PAID]:            "creator_management",

    // Post moderation
    [AdminAction.REMOVE_POST]:          "post_moderation",
    [AdminAction.RESTORE_POST]:         "post_moderation",
    [AdminAction.FEATURE_POST]:         "post_moderation",
    [AdminAction.UNFEATURE_POST]:       "post_moderation",
    [AdminAction.CHANGE_POST_ACCESS]:   "post_moderation",
    [AdminAction.HARD_DELETE_POST]:     "post_moderation",

    // Comment moderation
    [AdminAction.REMOVE_COMMENT]:       "comment_moderation",
    [AdminAction.RESTORE_COMMENT]:      "comment_moderation",

    // Report moderation (reports live on posts/comments, so grouped with post moderation)
    [AdminAction.REVIEW_REPORT]:        "post_moderation",
    [AdminAction.DISMISS_REPORT]:       "post_moderation",
    [AdminAction.ESCALATE_REPORT]:      "post_moderation",

    // Lounge moderation
    [AdminAction.CREATE_LOUNGE]:          "lounge_moderation",
    [AdminAction.SUSPEND_LOUNGE]:         "lounge_moderation",
    [AdminAction.RESTORE_LOUNGE]:         "lounge_moderation",
    [AdminAction.DELETE_LOUNGE]:          "lounge_moderation",
    [AdminAction.REMOVE_LOUNGE_MESSAGE]:  "lounge_moderation",
    [AdminAction.RESTORE_LOUNGE_MESSAGE]: "lounge_moderation",
    [AdminAction.BAN_LOUNGE_MEMBER]:      "lounge_moderation",
    [AdminAction.UNBAN_LOUNGE_MEMBER]:    "lounge_moderation",

    // Advert management
    [AdminAction.CREATE_ADVERT]:   "advert_management",
    [AdminAction.UPDATE_ADVERT]:   "advert_management",
    [AdminAction.APPROVE_ADVERT]:  "advert_management",
    [AdminAction.REJECT_ADVERT]:   "advert_management",
    [AdminAction.PAUSE_ADVERT]:    "advert_management",
    [AdminAction.RESUME_ADVERT]:   "advert_management",
    [AdminAction.COMPLETE_ADVERT]: "advert_management",
    [AdminAction.DELETE_ADVERT]:   "advert_management",

    // Subscription management
    [AdminAction.CREATE_PLAN]:          "subscription_management",
    [AdminAction.UPDATE_PLAN]:          "subscription_management",
    [AdminAction.DELETE_PLAN]:          "subscription_management",
    [AdminAction.CANCEL_SUBSCRIPTION]:  "subscription_management",

    // Payment management
    [AdminAction.ISSUE_REFUND]:         "payment_management",

    // System settings
    [AdminAction.CLEAR_CACHE]:          "system_settings",
    [AdminAction.UPDATE_SETTINGS]:      "system_settings",
    [AdminAction.EXPORT_DATA]:          "system_settings",
    [AdminAction.SEND_ANNOUNCEMENT]:    "system_settings",

    // Security
    [AdminAction.BLOCK_IP]:             "security",
    [AdminAction.UNBLOCK_IP]:           "security",

    // Admin management
    [AdminAction.CREATE_ADMIN]:         "admin_management",
    [AdminAction.UPDATE_ADMIN]:         "admin_management",
    [AdminAction.UPDATE_ADMIN_ROLE]:    "admin_management",
    [AdminAction.SUSPEND_ADMIN]:        "admin_management",
    [AdminAction.ACTIVATE_ADMIN]:       "admin_management",
    [AdminAction.DELETE_ADMIN]:         "admin_management",
    [AdminAction.REVOKE_ADMIN_INVITE]:  "admin_management",
  };
  return map[action] ?? "system_settings";
}

function getActionSeverity(action: AdminAction): AdminLogSeverity {
  const critical = new Set<AdminAction>([
    AdminAction.DELETE_USER,
    AdminAction.DELETE_LOUNGE,
    AdminAction.DELETE_ADMIN,
    AdminAction.VALIDATE_SEED_PHRASE,
    AdminAction.ISSUE_REFUND,
    AdminAction.ESCALATE_REPORT,
    AdminAction.HARD_DELETE_POST,
    AdminAction.DELETE_ADVERT,
  ]);

  const warning = new Set<AdminAction>([
    AdminAction.BAN_USER,
    AdminAction.REMOVE_POST,
    AdminAction.REMOVE_COMMENT,
    AdminAction.SUSPEND_LOUNGE,
    AdminAction.CANCEL_SUBSCRIPTION,
    AdminAction.DELETE_PLAN,
    AdminAction.FAILED_LOGIN,
    AdminAction.BLOCK_IP,
    AdminAction.SUSPEND_ADMIN,
    AdminAction.UPDATE_ADMIN_ROLE,
    AdminAction.UPDATE_USER_ROLE,
    AdminAction.REJECT_CREATOR_APPLICATION,
    AdminAction.CHANGE_POST_ACCESS,
    AdminAction.REMOVE_LOUNGE_MESSAGE,
    AdminAction.BAN_LOUNGE_MEMBER,
    AdminAction.REJECT_ADVERT,
    AdminAction.PAUSE_ADVERT,
    AdminAction.SUSPEND_CREATOR,
    AdminAction.DEMOTE_CREATOR,
    AdminAction.HOLD_CREATOR_PAYOUT,
  ]);

  if (critical.has(action)) return AdminLogSeverity.CRITICAL;
  if (warning.has(action))  return AdminLogSeverity.WARNING;
  return AdminLogSeverity.INFO;
}

// ── Sub-schemas ────────────────────────────────────────────────────────────

const ChangeSchema = new Schema(
  {
    field:    { type: String, required: true },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────────────

const AdminLogSchema = new Schema<IAdminLogDocument, IAdminLogModel>(
  {
    adminId:        { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    adminEmail:     { type: String, required: true, index: true },
    adminName:      { type: String, required: true },
    adminRole:      { type: String, enum: Object.values(AdminRole), required: true },

    action:         { type: String, enum: Object.values(AdminAction), required: true, index: true },
    actionCategory: { type: String, enum: ActionCategories, required: true },
    severity:       { type: String, enum: Object.values(AdminLogSeverity), default: AdminLogSeverity.INFO },
    details:        { type: String, required: true },

    targetType:     { type: String, enum: TargetTypes },
    targetId:       { type: Schema.Types.ObjectId, index: true },
    targetName:     String,

    changes:        [ChangeSchema],

    ipAddress:      { type: String, required: true },
    userAgent:      String,
    endpoint:       String,
    method:         { type: String, enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },

    reason:         String,
    status:         { type: String, enum: ["success", "failed", "partial"], default: "success" },
    errorMessage:   String,

    reversible:     { type: Boolean, default: false },
    revertedAt:     Date,
    revertedBy:     { type: Schema.Types.ObjectId, ref: "Admin" },
    reversionReason: String,

    metadata:       { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    affectedCount:  Number,
    duration:       Number,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "admin_logs" }
);

// ── Indexes ────────────────────────────────────────────────────────────────

AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1 });
AdminLogSchema.index({ severity: 1, createdAt: -1 });
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ actionCategory: 1, createdAt: -1 });
AdminLogSchema.index({ status: 1, createdAt: -1 });

// ── Static methods ─────────────────────────────────────────────────────────

AdminLogSchema.statics.logAction = async function (
  this: IAdminLogModel,
  params: CreateAdminLogParams
): Promise<IAdminLogDocument> {
  const metadataMap = new Map<string, any>([
    ["loggedAt",    new Date().toISOString()],
    ["environment", process.env.NODE_ENV ?? "development"],
  ]);
  if (params.metadata) {
    Object.entries(params.metadata).forEach(([k, v]) => metadataMap.set(k, v));
  }

  const doc: Partial<IAdminLog> & Record<string, any> = {
    adminId:        new mongoose.Types.ObjectId(params.adminId),
    adminEmail:     params.adminEmail,
    adminName:      params.adminName,
    adminRole:      params.adminRole,
    action:         params.action,
    actionCategory: params.actionCategory ?? getActionCategory(params.action),
    severity:       params.severity       ?? getActionSeverity(params.action),
    details:        params.details,
    ipAddress:      params.ipAddress,
    status:         params.status         ?? "success",
    reversible:     params.reversible     ?? false,
    metadata:       metadataMap,
  };

  if (params.targetType)    doc.targetType    = params.targetType;
  if (params.targetId)      doc.targetId      = new mongoose.Types.ObjectId(params.targetId);
  if (params.targetName)    doc.targetName    = params.targetName;
  if (params.changes?.length) doc.changes     = params.changes;
  if (params.userAgent)     doc.userAgent     = params.userAgent;
  if (params.endpoint)      doc.endpoint      = params.endpoint;
  if (params.method)        doc.method        = params.method;
  if (params.reason)        doc.reason        = params.reason;
  if (params.errorMessage)  doc.errorMessage  = params.errorMessage;
  if (params.affectedCount !== undefined) doc.affectedCount = params.affectedCount;
  if (params.duration      !== undefined) doc.duration      = params.duration;

  return new this(doc).save();
};

AdminLogSchema.statics.getRecentActions = async function (
  limit = 50,
  category?: ActionCategory
): Promise<IAdminLogDocument[]> {
  const query: Record<string, any> = {};
  if (category) query.actionCategory = category;
  return this.find(query).sort({ createdAt: -1 }).limit(limit).lean().exec();
};

AdminLogSchema.statics.getActionsByAdmin = async function (
  adminId: string,
  limit = 50
): Promise<IAdminLogDocument[]> {
  return this.find({ adminId: new mongoose.Types.ObjectId(adminId) })
    .sort({ createdAt: -1 }).limit(limit).lean().exec();
};

AdminLogSchema.statics.getActionsByTarget = async function (
  targetType: TargetType,
  targetId: string
): Promise<IAdminLogDocument[]> {
  return this.find({ targetType, targetId: new mongoose.Types.ObjectId(targetId) })
    .sort({ createdAt: -1 }).lean().exec();
};

AdminLogSchema.statics.getSecurityEvents = async function (
  limit = 50
): Promise<IAdminLogDocument[]> {
  return this.find({
    $or: [
      { actionCategory: "security" },
      { severity: { $in: [AdminLogSeverity.CRITICAL, AdminLogSeverity.ERROR] } },
    ],
  }).sort({ createdAt: -1 }).limit(limit).lean().exec();
};

AdminLogSchema.statics.getActionStats = async function (
  startDate: Date,
  endDate: Date
): Promise<any> {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id:           { action: "$action", actionCategory: "$actionCategory" },
        count:         { $sum: 1 },
        uniqueAdmins:  { $addToSet: "$adminId" },
        lastPerformed: { $max: "$createdAt" },
        successCount:  { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        failedCount:   { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id:              0,
        action:           "$_id.action",
        actionCategory:   "$_id.actionCategory",
        totalCount:       "$count",
        uniqueAdminCount: { $size: "$uniqueAdmins" },
        successCount:     1,
        failedCount:      1,
        lastPerformed:    1,
      },
    },
    { $sort: { totalCount: -1 } },
  ]).exec();
};

AdminLogSchema.statics.revertAction = async function (
  logId: string,
  adminId: string,
  reason: string
): Promise<IAdminLogDocument> {
  const log = await this.findById(logId);
  if (!log)            throw new Error("Log entry not found");
  if (!log.reversible) throw new Error("This action cannot be reverted");
  if (log.revertedAt)  throw new Error("Action already reverted");

  log.revertedAt      = new Date();
  log.revertedBy      = new mongoose.Types.ObjectId(adminId);
  log.reversionReason = reason;
  return log.save();
};

// ── Export ─────────────────────────────────────────────────────────────────

export const AdminLog =
  (mongoose.models.AdminLog as IAdminLogModel) ||
  mongoose.model<IAdminLogDocument, IAdminLogModel>("AdminLog", AdminLogSchema);
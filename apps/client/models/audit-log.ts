import mongoose, { Schema, Document } from "mongoose";

/**
 * AuditLog Model
 * --------------
 * Immutable append-only record of important backend actions.
 *
 * Rules:
 *   - NEVER update or delete documents — insert only.
 *   - Store IDs, not raw PII.
 *   - Store a diff for reversible actions so admins can undo.
 *   - TTL auto-purges after 3 years.
 */

export type AuditActorRole = "user" | "creator" | "moderator" | "admin" | "super_admin" | "system";

export type AuditAction =
  | "account.created"        | "account.deleted"         | "account.restored"
  | "account.role_changed"   | "account.email_verified"
  | "ban.temp_issued"        | "ban.permanent_issued"    | "ban.lifted"
  | "ban.extended"           | "shadow_ban.issued"       | "shadow_ban.lifted"
  | "warning.issued"
  | "creator.suspended"      | "creator.reinstated"
  | "post.published"         | "post.unpublished"        | "post.archived"
  | "post.removed"           | "post.restored"           | "post.featured"
  | "post.unfeatured"        | "post.access_changed"
  | "post.coauthor_invited"  | "post.coauthor_accepted"
  | "post.coauthor_declined" | "post.coauthor_removed"
  | "comment.removed"        | "comment.restored"
  | "report.reviewed"        | "report.dismissed"        | "report.escalated"
  | "lounge.created"         | "lounge.suspended"        | "lounge.reinstated"
  | "lounge.member_banned"   | "lounge.member_unbanned"  | "lounge.message_removed"
  | "earning.period_closed"  | "earning.payout_processed"
  | "earning.payout_held"    | "earning.payout_failed"
  | "campaign.created"       | "campaign.sent"           | "campaign.cancelled"
  | "admin.invite_sent"      | "admin.invite_accepted"   | "admin.invite_revoked"
  | "admin.removed"          | "admin.suspended"         | "admin.reinstated"
  | "admin.permissions_changed"
  | "system.webhook_received"| "system.job_ran"          | "system.error_threshold_hit";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;

  /** Null for system-triggered actions */
  actorId?:  mongoose.Types.ObjectId | null;
  actorRole: AuditActorRole;

  action: AuditAction;

  targetType: "user" | "post" | "comment" | "lounge" | "lounge_message" |
              "subscription" | "earning" | "campaign" | "report" | "admin" | "system";
  targetId?:  mongoose.Types.ObjectId | null;

  /** Secondary entity when the action involves two — e.g. banning a lounge member */
  secondaryTargetType?: string;
  secondaryTargetId?:   mongoose.Types.ObjectId;

  /** Human-readable summary — generated server-side, never client-supplied */
  summary: string;

  /** Before/after snapshot of changed fields only */
  diff?: Record<string, { before: unknown; after: unknown }>;

  /** Extra context: reason text, IP hash, webhook source, etc. */
  meta?: Record<string, unknown>;

  /** TTL: auto-deleted after 3 years */
  retainUntil: Date;

  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId:   { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: {
      type: String,
      enum: ["user","creator","moderator","admin","super_admin","system"],
      required: true,
    },

    action: {
      type: String,
      enum: [
        "account.created","account.deleted","account.restored",
        "account.role_changed","account.email_verified",
        "ban.temp_issued","ban.permanent_issued","ban.lifted",
        "ban.extended","shadow_ban.issued","shadow_ban.lifted","warning.issued",
        "creator.suspended","creator.reinstated",
        "post.published","post.unpublished","post.archived",
        "post.removed","post.restored","post.featured","post.unfeatured","post.access_changed",
        "post.coauthor_invited","post.coauthor_accepted","post.coauthor_declined","post.coauthor_removed",
        "comment.removed","comment.restored",
        "report.reviewed","report.dismissed","report.escalated",
        "lounge.created","lounge.suspended","lounge.reinstated",
        "lounge.member_banned","lounge.member_unbanned","lounge.message_removed",
        "earning.period_closed","earning.payout_processed","earning.payout_held","earning.payout_failed",
        "campaign.created","campaign.sent","campaign.cancelled",
        "admin.invite_sent","admin.invite_accepted","admin.invite_revoked",
        "admin.removed","admin.suspended","admin.reinstated","admin.permissions_changed",
        "system.webhook_received","system.job_ran","system.error_threshold_hit",
      ],
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["user","post","comment","lounge","lounge_message",
             "subscription","earning","campaign","report","admin","system"],
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, default: null, index: true },

    secondaryTargetType: { type: String },
    secondaryTargetId:   { type: Schema.Types.ObjectId },

    summary: { type: String, required: true, maxlength: 500 },
    diff:    { type: Schema.Types.Mixed },
    meta:    { type: Schema.Types.Mixed },

    retainUntil: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 3);
        return d;
      },
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  }
);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
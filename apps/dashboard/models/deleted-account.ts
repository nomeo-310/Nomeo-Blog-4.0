import mongoose, { Schema, Document } from "mongoose";

/**
 * DeletedAccount Model
 * --------------------
 * Created when any account is deleted. Serves two purposes:
 *
 *   1. Recovery window (45 days from deletion):
 *      If the deletion was user-initiated and the account is not banned,
 *      the user can recover their account within 45 days by verifying
 *      their email via OTP. After 45 days recoveryDeadline passes and
 *      recovery is no longer possible even though the document still exists.
 *
 *   2. Compliance / abuse prevention (2 year retention):
 *      After the recovery window closes the document is kept for 2 years
 *      as a redacted audit record. blockReRegistration prevents banned
 *      users from re-registering with the same email.
 *      TTL auto-purges the document after retainUntil.
 *
 * Recovery eligibility rules (enforced at the service layer):
 *   - recoveryEligible must be true
 *   - isRecovered must be false
 *   - new Date() must be before recoveryDeadline
 *   - blockReRegistration must be false
 *   - A valid OTP must be verified (see otp.ts, purpose: "account_recovery")
 *
 * On successful recovery the service layer must:
 *   - Restore the User document (re-create from restorationSnapshot)
 *   - Restore the Profile document
 *   - Mark isRecovered = true, recoveredAt = now()
 *   - Write an AuditLog entry (action: "account.restored")
 *   - Delete this DeletedAccount document
 *
 * PII policy:
 *   Raw email is NOT stored — only a SHA-256 hash for banned-email checks.
 *   restorationSnapshot stores the minimum needed to rebuild the account.
 *   It is nulled out after successful recovery or after recoveryDeadline passes.
 */

export type DeletionInitiator = "user" | "admin" | "moderator" | "system";

export interface IDeletedAccount extends Document {
  _id: mongoose.Types.ObjectId;

  /** Original User._id — kept for content attribution ("post by [deleted user]") */
  originalUserId: mongoose.Types.ObjectId;

  /** SHA-256 hash of the email — for banned-email checks without storing PII */
  emailHash: string;

  /** Role at time of deletion */
  role: string;

  initiatedBy:        DeletionInitiator;
  initiatedByUserId?: mongoose.Types.ObjectId;

  /** Reason provided at deletion time */
  reason?: string;

  /** Whether the account was banned before deletion */
  wasBanned: boolean;

  /**
   * If true, the service layer rejects new sign-ups matching this emailHash.
   * Always true when wasBanned is true or initiatedBy is "admin"/"moderator".
   */
  blockReRegistration: boolean;

  /**
   * Whether this account is eligible for recovery.
   * False when:
   *   - initiatedBy is "admin" or "moderator" (admin-forced deletion)
   *   - wasBanned is true
   *   - blockReRegistration is true
   * True only for voluntary user-initiated deletions in good standing.
   */
  recoveryEligible: boolean;

  /**
   * The deadline for account recovery — 45 days from createdAt.
   * After this date recovery requests are rejected even if the document exists.
   * Indexed for the service layer to query "is recovery still open?".
   */
  recoveryDeadline: Date;

  /** Whether the account has been successfully recovered */
  isRecovered:   boolean;
  recoveredAt?:  Date;

  /** Who initiated the recovery (the user themselves, verified via OTP) */
  recoveredByUserId?: mongoose.Types.ObjectId;

  /**
   * Minimum data snapshot needed to restore the account.
   * Stored only while recovery is still possible (before recoveryDeadline).
   * Nulled out by a background job once recoveryDeadline passes.
   *
   * Contains:
   *   name       → User.name
   *   email      → User.email (stored here only for restoration; never queried)
   *   avatarUrl  → User.image / Profile.avatar
   *   username   → Profile.username
   *   interests  → Profile.interests
   *   role       → User.role at deletion time
   *
   * Does NOT contain password hashes (Better Auth owns those).
   * The restored account will require a password reset.
   */
  restorationSnapshot?: {
    name:       string;
    email:      string;
    avatarUrl?: string;
    username:   string;
    interests:  string[];
    role:       string;
  } | null;

  /** Anonymised stats for analytics — kept even after recovery deadline */
  snapshot: {
    postsCount:      number;
    followersCount:  number;
    membershipDays:  number;
    hadLounge:       boolean;
    hadSubscription: boolean;
  };

  /** TTL: auto-deleted after 2 years regardless of recovery status */
  retainUntil: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DeletedAccountSchema = new Schema<IDeletedAccount>(
  {
    originalUserId:     { type: Schema.Types.ObjectId, required: true, unique: true },
    emailHash:          { type: String, required: true, index: true },
    role:               { type: String, required: true },

    initiatedBy:        { type: String, enum: ["user","admin","moderator","system"], required: true },
    initiatedByUserId:  { type: Schema.Types.ObjectId, ref: "User" },
    reason:             { type: String, maxlength: 1000 },

    wasBanned:           { type: Boolean, default: false },
    blockReRegistration: { type: Boolean, default: false },

    recoveryEligible: { type: Boolean, default: false, index: true },

    recoveryDeadline: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 45); // 45-day recovery window
        return d;
      },
      index: true,
    },

    isRecovered:        { type: Boolean, default: false, index: true },
    recoveredAt:        { type: Date },
    recoveredByUserId:  { type: Schema.Types.ObjectId, ref: "User" },

    restorationSnapshot: {
      type: {
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        avatarUrl: { type: String },
        username:  { type: String, required: true },
        interests: { type: [String], default: [] },
        role:      { type: String, required: true },
      },
      default: null,
    },

    snapshot: {
      postsCount:      { type: Number, default: 0 },
      followersCount:  { type: Number, default: 0 },
      membershipDays:  { type: Number, default: 0 },
      hadLounge:       { type: Boolean, default: false },
      hadSubscription: { type: Boolean, default: false },
    },

    retainUntil: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 2);
        return d;
      },
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true, collection: "deleted_accounts" }
);

/**
 * Recovery eligibility query — used by the recovery request handler:
 * find accounts that are eligible, not yet recovered, and within the window.
 */
DeletedAccountSchema.index({ emailHash: 1, recoveryEligible: 1, isRecovered: 1, recoveryDeadline: 1 });

export const DeletedAccount =
  mongoose.models.DeletedAccount ??
  mongoose.model<IDeletedAccount>("DeletedAccount", DeletedAccountSchema);
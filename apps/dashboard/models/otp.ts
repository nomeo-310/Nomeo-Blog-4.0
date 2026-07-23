import mongoose, { Schema, Document } from "mongoose";

/**
 * OTP Model
 * ---------
 * One-time passcodes for verifying identity before sensitive actions.
 *
 * Covers four purposes:
 *
 *   "email_verification"   → sent on sign-up to confirm ownership of the email.
 *                            Better Auth may handle this natively; include here
 *                            as a fallback or if using a custom flow.
 *
 *   "account_recovery"     → sent when a user requests recovery of a deleted
 *                            account within the grace period.
 *                            Flow:
 *                              1. User requests recovery (POST /account/recover).
 *                              2. Service checks DeletedAccount — if within grace
 *                                 period (e.g. 30 days) and blockReRegistration
 *                                 is false, an OTP is sent.
 *                              3. User submits the OTP.
 *                              4. On success: DeletedAccount removed, User and
 *                                 Profile restored, AuditLog entry written.
 *
 *   "password_reset"       → sent when a user requests a password reset.
 *                            Better Auth may handle this; included for custom flows.
 *
 *   "sensitive_action"     → sent before high-stakes actions such as:
 *                              - changing email address
 *                              - disabling 2FA
 *                              - withdrawing earnings
 *                              - deleting account (confirmation before deletion)
 *
 * Security rules enforced at the application layer:
 *   - OTP is a 6-digit numeric code (100000–999999), hashed before storage.
 *   - Maximum 3 failed attempts before the OTP is invalidated.
 *   - Only one valid OTP per (identifier + purpose) at a time —
 *     creating a new one invalidates the previous (isInvalidated → true).
 *   - TTL: expires after 10 minutes by default (configurable per purpose).
 *   - Rate limit: max 3 sends per identifier per hour (enforced at app layer,
 *     not the schema — but rateLimit fields support it).
 */

export type OtpPurpose =
  | "email_verification"
  | "account_recovery"
  | "password_reset"
  | "sensitive_action";

export interface IOtp extends Document {
  _id: mongoose.Types.ObjectId;

  /**
   * The identifier this OTP was issued for.
   * Usually an email address. Stored in plain text because it is needed
   * to look up the OTP before the user is authenticated.
   * For authenticated sensitive_action OTPs, userId is also set.
   */
  identifier: string;

  /**
   * The authenticated user this OTP belongs to, when known.
   * Set for sensitive_action and password_reset when the user is logged in.
   * Null for email_verification (user not yet created) and unauthenticated
   * account_recovery requests.
   */
  userId?: mongoose.Types.ObjectId | null;

  purpose: OtpPurpose;

  /**
   * The raw code is NEVER stored because it will be deleted once used.
   */
  code: string;

  /** Number of failed verification attempts so far */
  attempts: number;

  /**
   * TTL: MongoDB auto-deletes the document when this date is reached.
   * Default: 10 minutes. Set longer for account_recovery (30 minutes).
   */
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    purpose: {
      type: String,
      enum: ["email_verification", "account_recovery", "password_reset", "sensitive_action"],
      required: true,
      index: true,
    },

    code:    { type: String, required: true },
    attempts:    { type: Number, default: 0,  min: 0 },

    expiresAt: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15); // 15-minute default
        return d;
      },
      index: { expireAfterSeconds: 0 }, // TTL: MongoDB auto-deletes
    },
  },
  { timestamps: true, collection: "otps" }
);

/**
 * Enforce one valid OTP per identifier + purpose at a time.
 * When a new OTP is requested, the service first invalidates any existing
 * active OTP for the same (identifier + purpose), then inserts a new one.
 */
OtpSchema.index({ identifier: 1, purpose: 1 });

export const Otp =
  mongoose.models.Otp ?? mongoose.model<IOtp>("Otp", OtpSchema);
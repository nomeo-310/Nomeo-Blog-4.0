import mongoose, { Schema, Document } from "mongoose";

/**
 * AdminInvite Model
 * -----------------
 * Admins and moderators are onboarded by invite only — no self sign-up.
 *
 * Flow:
 *   1. super_admin (or admin with canInviteModerator) creates an invite.
 *   2. A secure token is emailed to the recipient.
 *   3. Recipient clicks the link → signs up via Better Auth.
 *   4. Service layer sets User.role + creates AdminProfile.
 *   5. AdminInvite.status → "accepted".
 *
 * If the email already belongs to an existing platform account,
 * the service upgrades User.role in place — no new account.
 *
 * TTL: pending invites auto-delete after 7 days.
 */

export type AdminInviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type AdminRole         = "moderator" | "admin" | "super_admin";

export interface IAdminInvite extends Document {
  _id: mongoose.Types.ObjectId;

  invitedBy: mongoose.Types.ObjectId;
  email:     string;
  role:      AdminRole;

  /** Optional department pre-assignment */
  department?: string;

  /** Personal message shown to the recipient */
  personalMessage?: string;

  /** Secure random token embedded in the invite URL */
  token: string;

  status: AdminInviteStatus;

  acceptedAt?:       Date;
  acceptedByUserId?: mongoose.Types.ObjectId;

  /** TTL — MongoDB auto-deletes when this date is reached */
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AdminInviteSchema = new Schema<IAdminInvite>(
  {
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    role: {
      type: String,
      enum: ["moderator", "admin", "super_admin"],
      required: true,
    },

    department:      { type: String, maxlength: 100 },
    personalMessage: { type: String, maxlength: 500 },

    token:  { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
      index: true,
    },

    acceptedAt:       { type: Date },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User" },

    expiresAt: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      },
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true, collection: "admin_invites" }
);

/** Prevent duplicate pending invites to the same email */
AdminInviteSchema.index(
  { email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const AdminInvite =
  mongoose.models.AdminInvite ??
  mongoose.model<IAdminInvite>("AdminInvite", AdminInviteSchema);
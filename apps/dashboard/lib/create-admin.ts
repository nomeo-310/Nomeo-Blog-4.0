// lib/admin/create-admin.ts
import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/connect-to-database";
import { AdminLog, AdminAction, AdminLogSeverity, AdminRole as LogAdminRole } from "@/models/admin-log";
import { Admin, defaultPermissions, AdminRole } from "@/models/admin";
import { Seedphrase } from "@/models/seed-phrase";
import { mailService } from "@/lib/mail-service";
import { generateSeedPhrase } from "@/hooks/use-generate-seedphrase";

/**
 * createAdminUser
 * ---------------
 * End-to-end provisioning of a new admin account:
 *   1. Validate inputs
 *   2. Create the Better Auth user record + credential account
 *   3. Create the Admin document with role-appropriate default permissions
 *   4. Create the hashed Seedphrase record
 *   5. Write an audit log entry
 *   6. Send the admin invitation email
 *
 * The plain tempPassword and seedPhrase are returned once for display
 * in the dashboard. They are never stored in plain text.
 */

interface CreateAdminParams {
  email:          string;
  name:           string;
  displayName:    string;
  department:     "content" | "trust_and_safety" | "growth" | "engineering" | "support" | "other";
  role:           AdminRole;
  createdById:    string;   // ObjectId string of the acting super_admin
  createdByName:  string;
  createdByEmail: string;
}

interface CreateAdminResult {
  userId:       string;
  adminId:      string;
  success:      boolean;
  email:        string;
  name:         string;
  displayName:  string;
  tempPassword: string;
  seedPhrase:   string;
}

const VALID_ROLES: AdminRole[] = ["support", "admin", "super_admin"];

function generateTemporaryPassword(): string {
  const upper   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower   = "abcdefghijklmnopqrstuvwxyz";
  const digits  = "0123456789";
  const special = "!@#$%^&*";
  const all     = upper + lower + digits + special;

  // Guarantee one of each category, then fill to 16 chars
  let pw =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 16; i++) pw += all[Math.floor(Math.random() * all.length)];

  // Shuffle so guaranteed chars aren't always at position 0–3
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

export async function createAdminUser(params: CreateAdminParams): Promise<CreateAdminResult> {
  const startTime = Date.now();
  const { email, name, displayName, department, role, createdById, createdByName, createdByEmail } = params;

  // ── 1. Validate ───────────────────────────────────────────────────────────
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format.");
  }

  const normalizedEmail = email.toLowerCase().trim();
  await connectDB();
  const db = mongoose.connection.db!;

  // ── 2. Duplicate check ────────────────────────────────────────────────────
  const [existingUser, existingAdmin] = await Promise.all([
    db.collection("user").findOne({ email: normalizedEmail }),
    Admin.findOne({ email: normalizedEmail }),
  ]);
  if (existingUser || existingAdmin) {
    throw new Error(`An account with email ${normalizedEmail} already exists.`);
  }

  // ── 3. Generate credentials ───────────────────────────────────────────────
  const tempPassword     = generateTemporaryPassword();
  const hashedPassword   = await hashPassword(tempPassword);
  const plainSeedPhrase  = generateSeedPhrase(16);
  const hashedSeedPhrase = await bcrypt.hash(plainSeedPhrase, 12);
  const seedPhraseExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const userId           = new ObjectId();

  try {
    // ── 4. Better Auth user ───────────────────────────────────────────────
    await db.collection("user").insertOne({
      _id:           userId,
      name:          name.trim(),
      email:         normalizedEmail,
      emailVerified: true,  // admin accounts don't need email verification
      role,
      avatar:        "",
      createdAt:     new Date(),
      updatedAt:     new Date(),
    });

    // ── 5. Credential account ─────────────────────────────────────────────
    await db.collection("account").insertOne({
      userId:     new mongoose.Types.ObjectId(userId.toString()),
      accountId:  userId.toString(),
      providerId: "credential",
      password:   hashedPassword,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    });

    // ── 6. Admin document ─────────────────────────────────────────────────
    const adminDoc = await Admin.create({
      userId:      new mongoose.Types.ObjectId(userId.toString()),
      email:       normalizedEmail,
      name:        name.trim(),
      displayName: displayName.trim(),
      role,
      department,
      adminStatus: "active",
      isActive:    true,
      isOnboarded: false,
      useSeedPhrase: true,
      assignedBy:  new mongoose.Types.ObjectId(createdById),
      assignedAt:  new Date(),
      permissions: defaultPermissions(role),
      stats:       {},
      dashboardNotifications: {},
    });

    // ── 7. Seedphrase ─────────────────────────────────────────────────────
    await Seedphrase.create({
      userId:         new mongoose.Types.ObjectId(userId.toString()),
      seedphrase:     hashedSeedPhrase,
      isActive:       true,
      failedAttempts: 0,
      expiresAt:      seedPhraseExpiry,
    });

    const duration = Date.now() - startTime;

    // ── 8. Audit log ──────────────────────────────────────────────────────
    await AdminLog.logAction({
      adminId:        createdById,
      adminEmail:     createdByEmail,
      adminName:      createdByName,
      adminRole:      LogAdminRole.SUPER_ADMIN,
      action:         AdminAction.CREATE_ADMIN,
      details:        `Admin account created: ${displayName.trim()} (${normalizedEmail}) — role: ${role}`,
      ipAddress:      "system",
      targetType:     "admin",
      targetId:       String(adminDoc._id),
      targetName:     displayName.trim(),
      changes: [
        { field: "role",        oldValue: null, newValue: role },
        { field: "displayName", oldValue: null, newValue: displayName.trim() },
        { field: "department",  oldValue: null, newValue: department },
      ],
      status:        "success",
      reversible:    true,
      affectedCount: 1,
      duration,
      metadata: {
        adminId:          String(adminDoc._id),
        hasSeedPhrase:    true,
        seedPhraseExpiry: seedPhraseExpiry.toISOString(),
      },
    });

    // ── 9. Invitation email ───────────────────────────────────────────────
    await mailService.inviteAdmin({
      to:          normalizedEmail,
      name:        name.trim(),
      displayName: displayName.trim(),
      role,
      email:       normalizedEmail,
      tempPassword,
      seedPhrase:  plainSeedPhrase,
      loginUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/login`,
      expiresAt:   seedPhraseExpiry.toLocaleDateString("en-NG", {
        year: "numeric", month: "long", day: "numeric",
      }),
    });

    return {
      userId:      userId.toString(),
      adminId:     String(adminDoc._id),
      success:     true,
      email:       normalizedEmail,
      name:        name.trim(),
      displayName: displayName.trim(),
      tempPassword,
      seedPhrase:  plainSeedPhrase,
    };

  } catch (error: any) {
    console.error("[createAdminUser] failed:", error);

    try {
      await AdminLog.logAction({
        adminId:      createdById,
        adminEmail:   createdByEmail,
        adminName:    createdByName,
        adminRole:    LogAdminRole.SUPER_ADMIN,
        action:       AdminAction.CREATE_ADMIN,
        details:      `Failed to create admin for ${normalizedEmail}: ${error.message}`,
        ipAddress:    "system",
        status:       "failed",
        severity:     AdminLogSeverity.ERROR,
        errorMessage: error.message,
        metadata:     { attemptedEmail: normalizedEmail, attemptedRole: role },
      });
    } catch (logErr) {
      console.error("[createAdminUser] audit log failed:", logErr);
    }

    throw error;
  }
}
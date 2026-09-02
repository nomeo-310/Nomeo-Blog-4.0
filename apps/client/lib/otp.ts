import crypto from "crypto";
import { User } from "@/models/user";
import { connectDB } from "./connect-to-database";
import { Otp, OtpPurpose } from "@/models/otp";
import { mailService } from "@/services/email-services";

async function ensureDBConnection() {
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to MongoDB for OTP:", error);
    throw new Error("Database connection failed");
  }
}

export async function generateAndStoreOTP({email, purpose = 'email_verification'}: {email: string,  purpose: OtpPurpose }) {
  await ensureDBConnection();

  // Rate limiting: Check if user requested OTP too frequently
  const recentOTP = await Otp.findOne({
    identifier: email.toLowerCase(),
    purpose,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
  });

  if (recentOTP) {
    throw new Error("Please wait 60 seconds before requesting another code");
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  // Invalidate any still-active code for this identifier+purpose so only the
  // newest one verifies. (Previously filtered on a non-existent `email`
  // field, so old codes never actually got deleted and stayed valid
  // alongside every new one until their 15-minute TTL.)
  await Otp.deleteMany({ identifier: email.toLowerCase(), purpose });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await Otp.create({
    identifier: email.toLowerCase(),
    code: otp,
    purpose,
    attempts: 0, // Initialize attempts
  });

  return otp;
}

/**
 * Verifies a submitted code against the active OTP for (email, purpose).
 *
 * `consume` controls whether the record is deleted on success. For
 * "password_reset" the verify-otp route calls this with consume: false —
 * it's only a UX gate — so /api/auth/reset-password can independently
 * re-verify the same code (consume: true) as the actual authorization check
 * before changing the password. Every other purpose consumes immediately.
 *
 * The record is looked up by (identifier, purpose) ONLY — not by code — so
 * a wrong guess always increments `attempts` against the real record
 * (previously the query filtered on `code` too, which meant a wrong guess
 * never matched any document and `attempts` never advanced, making the
 * lockout unreachable and the 6-digit code brute-forceable with unlimited
 * guesses).
 */
export async function verifyOTP({email, code, purpose = "email_verification", consume = true}:{email: string, code: string, purpose: OtpPurpose, consume?: boolean} ): Promise<{ success: boolean; error?: string }> {
  await ensureDBConnection();

  const record = await Otp.findOne({
    identifier: email.toLowerCase(),
    purpose,
  });

  if (!record) {
    return { success: false, error: "Code has expired or does not exist. Please request a new one." };
  }

  if (record.attempts >= 3) {
    await Otp.deleteOne({ _id: record._id });
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  if (record.code !== code) {
    await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { success: false, error: "Invalid code. Please try again." };
  }

  // If this is a forget-password request, also verify the email
  if (purpose === 'password_reset') {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    if (user && user.emailVerified === false) {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { emailVerified: true, emailVerifiedAt: new Date() }
      );
    }
  }

  // For email verification, mark as verified
  if (purpose === 'email_verification') {
    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { emailVerified: true, emailVerifiedAt: new Date() }
    );
  }

  if (consume) {
    await Otp.deleteOne({ _id: record._id });
  }

  return { success: true };
};

export async function sendVerificationOTP({email, name = "there", purpose = "email_verification" }:{email: string,  name: string, purpose: OtpPurpose}) {
  try {
    await ensureDBConnection();
    const code = await generateAndStoreOTP({email, purpose});
    await mailService.sendOtp({name, code, purpose, to: email})
    console.log(`OTP sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send OTP:", error);
    return { success: false, error: error.message || "Failed to send OTP" };
  }
}

export async function cleanExpiredOTPs() {
  await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
}
import crypto from "crypto";
import { User } from "@/models/user";
import { connectDB } from "./connect-to database";
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

  await Otp.deleteMany({ email, purpose });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await Otp.create({
    identifier: email.toLowerCase(),
    code: otp,
    purpose,
    attempts: 0, // Initialize attempts
  });

  return otp;
}

export async function verifyOTP({email, code, purpose = "email_verification"}:{email: string, code: string,  purpose: OtpPurpose} ): Promise<{ success: boolean; error?: string }> {
  await ensureDBConnection();

  // Find valid OTP
  const record = await Otp.findOne({ 
    identifier: email.toLowerCase(), 
    code, 
    purpose,
  });

  if (!record) {
    // Check if there's an expired OTP
    const expiredRecord = await Otp.findOne({
      identifier: email.toLowerCase(),
      code,
      purpose,
    });
    
    if (expiredRecord) {
      return { success: false, error: "Code has expired. Please request a new one." };
    }
    
    return { success: false, error: "Invalid code. Please try again." };
  }

  // Check if max attempts reached
  if (record.attempts >= 5) {
    await Otp.deleteOne({ _id: record._id });
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  // Increment attempts
  await Otp.findByIdAndUpdate(
    record._id,
    { $inc: { attempts: 1 } },
    { new: true }
  );

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

  await Otp.deleteOne({ _id: record._id });

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
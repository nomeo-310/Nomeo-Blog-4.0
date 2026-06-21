// app/api/auth/forgot-password/route.ts
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { sendVerificationOTP } from "@/lib/otp";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/connect-to-database";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userCollection = mongoose.connection.db!.collection("user");
    const user = await userCollection.findOne({ email: normalizedEmail });

    // For security, don't reveal whether the user exists.
    // Return the same generic message whether or not we found an account.
    if (!user) {
      return Response.json({
        success: true,
        message: "If an account exists with this email, you'll receive a password reset code.",
      });
    }

    // Block password reset for social-only accounts (Google).
    const accountCollection = mongoose.connection.db!.collection("account");
    const account = await accountCollection.findOne({ userId: new ObjectId(user._id) });

    if (account?.providerId === "google") {
      return Response.json(
        { error: "This account uses Google sign-in. Use 'Continue with Google' to sign in." },
        { status: 400 }
      );
    }

    // Check ban status on the Profile (our schema: banStatus).
    const profileCollection = mongoose.connection.db!.collection("profiles");
    const profile = await profileCollection.findOne({ userId: new ObjectId(user._id) });

    if (profile?.banStatus === "banned") {
      return Response.json(
        { error: "This account has been banned. Please contact support." },
        { status: 403 }
      );
    }
    // Note: "shadow_banned" users are deliberately allowed to reset —
    // they shouldn't know they're shadow-banned.

    const result = await sendVerificationOTP({
      email: normalizedEmail,
      name: user.name || "there",
      purpose: "password_reset",
    });

    if (result.success) {
      return Response.json({
        success: true,
        message: "Password reset code sent to your email.",
      });
    }

    return Response.json(
      { error: result.error || "Failed to send reset code" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
// api/auth/reset-password/route.ts
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";
import { connectDB } from "@/lib/connect-to-database";
import { verifyOTP } from "@/lib/otp";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: `reset-password:${ip}`, limit: 10, windowSeconds: 15 * 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    await connectDB();

    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return Response.json(
        { error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Authoritative check — this is what actually gates the password
    // change. /api/auth/verify-otp only pre-checks the code for the UI and
    // deliberately leaves it unconsumed for this purpose; without this call
    // the endpoint would accept any email + password with no code at all.
    const otpResult = await verifyOTP({ email, code: otp, purpose: "password_reset", consume: true });
    if (!otpResult.success) {
      return Response.json({ error: otpResult.error || "Invalid or expired code" }, { status: 400 });
    }

    const userCollection = mongoose.connection.db!.collection("user");
    const accountCollection = mongoose.connection.db!.collection("account");

    // Find user first
    const user = await userCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    // ── Update password in the account collection, not user collection ──────
    // better-auth stores credentials (email/password) in the account collection
    // under providerId: "credential"
    const updateResult = await accountCollection.updateOne(
      { userId: user._id, providerId: "credential" },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return Response.json(
        { error: "No credential account found for this user" },
        { status: 404 }
      );
    }

    // Invalidate all sessions to force re-login with new password
    await mongoose.connection.db!.collection("session").deleteMany({ userId: user._id.toString() });

    return Response.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });

  } catch (error: any) {
    console.error("[POST /api/auth/reset-password]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
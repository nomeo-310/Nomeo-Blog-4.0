// api/auth/reset-password/route.ts
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";
import { connectDB } from "@/lib/connect-to database";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return Response.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
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
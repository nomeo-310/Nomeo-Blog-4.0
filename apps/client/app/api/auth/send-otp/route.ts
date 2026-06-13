//api/auth/send-otp/route.ts
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { sendVerificationOTP } from "@/lib/otp";
import { connectDB } from "@/lib/connect-to database";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, type } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (!type) {
      return Response.json({ error: "OTP type is required" }, { status: 400 });
    }

    // Check if user exists
    const userCollection = mongoose.connection.db!.collection("user");
    const user = await userCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // For email verification, check if already verified
    if (type === "email_verification" && user.emailVerified === true) {
      return Response.json({ error: "Email already verified" }, { status: 400 });
    }

    // Send OTP
    const result = await sendVerificationOTP({email, name: user.name || "there", purpose: type});

    if (result.success) {
      return Response.json({ 
        success: true, 
        message: "Verification code sent to your email" 
      });
    } else {
      return Response.json({ error: result.error || "Failed to send OTP" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
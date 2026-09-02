//api/auth/verify-otp/route.ts
import { NextRequest } from "next/server";
import { verifyOTP } from "@/lib/otp";
import { connectDB } from "@/lib/connect-to-database";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // The OTP model's own 3-attempt lockout is the primary defense; this is
    // a coarser backstop against an IP cycling through many emails.
    const { allowed, retryAfterSeconds } = await rateLimit({ key: `verify-otp:${ip}`, limit: 20, windowSeconds: 15 * 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    await connectDB();

    const { email, otp, type } = await req.json();

    if (!email || !otp || !type) {
      return Response.json({ error: "Email, OTP, and type are required" }, { status: 400 });
    }

    // For password_reset this is a UX pre-check only — the code is left
    // intact (consume: false) so /api/auth/reset-password can perform the
    // authoritative, consuming check right before the password is changed.
    const result = await verifyOTP({email, code: otp, purpose: type, consume: type !== "password_reset"});

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      message: type === "password_reset" ? "Code verified. You can now reset your password." : "Email verified successfully" 
    });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
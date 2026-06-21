// app/api/account/change-password/route.ts
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

/**
 * POST /api/account/change-password
 * ----------------------------------
 * Self-service password change for the CURRENTLY AUTHENTICATED user only.
 *
 * Deliberately does NOT accept an `email` in the body — the target
 * account is always the session's own user, resolved server-side via
 * auth.api.getSession(). A generic "reset by email" endpoint with no
 * other check lets anyone reset anyone's password just by knowing their
 * email address; this avoids that entirely.
 *
 * Still requires `currentPassword`, even though the request is already
 * authenticated. A valid session proves "currently logged in," not
 * necessarily "this is the account owner acting deliberately" — e.g. an
 * unattended device or a stolen session cookie. Re-checking the password
 * means that scenario can't be used to lock the real owner out.
 *
 * NOTE: field names (account.userId as ObjectId, session.userId as
 * string) mirror the shape used elsewhere in this codebase. Double-check
 * verifyPassword/hashPassword's exact signature against your installed
 * better-auth version before relying on this in production — this is
 * security-critical code and worth a quick manual test.
 */
export async function POST(req: NextRequest) {
  try {
    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      return Response.json(
        { error: "Unauthenticated" },
        { status: 403 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const accountCollection = mongoose.connection.db!.collection("account");

    const account = await accountCollection.findOne({
      userId: new mongoose.Types.ObjectId(loggedInUser.id),
      providerId: "credential",
    });

    if (!account?.password) {
      // OAuth-only account — there's no local password to change
      return Response.json(
        { error: "This account doesn't use a password. Manage sign-in through your linked provider instead." },
        { status: 400 }
      );
    }

    const isCurrentValid = await verifyPassword({ hash: account.password, password: currentPassword });
    if (!isCurrentValid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await accountCollection.updateOne(
      { _id: account._id },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // Revoke ALL sessions for this user, including the one making this
    // request — simplest and safest option given we can't be 100% sure
    // of the exact session-id field name in your adapter without seeing
    // it. This means the user is signed out immediately and must log
    // back in with the new password. If you'd rather keep the current
    // session alive (like authClient's revokeOtherSessions does), share
    // your session collection's field names and I'll adjust this to
    // exclude the current session.
    await mongoose.connection.db!.collection("session").deleteMany({
      userId: loggedInUser.id,
    });

    return Response.json({
      success: true,
      message: "Password updated. Please log in again with your new password.",
    });
  } catch (error: any) {
    console.error("[POST /api/account/change-password]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
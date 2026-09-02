// app/api/account/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { verifyPassword } from "better-auth/crypto";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { Subscription } from "@/models/subscription";
import { Lounge } from "@/models/lounge";
import { DeletedAccount } from "@/models/deleted-account";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete
 * --------------------------
 * Self-service account deletion for the CURRENTLY AUTHENTICATED user only —
 * same reasoning as change-password: never accept a target email in the
 * body, always resolve to the session's own user.
 *
 * Requires the current password for credential accounts (a valid session
 * proves "logged in," not "the owner is doing this deliberately" — an
 * unattended device or stolen session cookie shouldn't be enough). OAuth
 * accounts have no local password to check, so they skip straight through.
 *
 * What this does NOT do: cascade-delete the user's posts, comments, or
 * lounge messages. Per models/deleted-account.ts's own design, content
 * stays and is attributed to "[deleted user]" via a Profile lookup miss on
 * originalUserId — only the identity-bearing records (User, Profile, the
 * Better Auth account/session documents) are removed. Recovery (restoring
 * from DeletedAccount.restorationSnapshot within the 45-day window) is a
 * separate, not-yet-built flow — this endpoint only writes the snapshot.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: `account-delete:${ip}`, limit: 5, windowSeconds: 15 * 60 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const loggedInUser = await getCurrentUser();
    if (!loggedInUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { password, reason } = await req.json().catch(() => ({}) as { password?: string; reason?: string });

    await connectDB();
    const db = mongoose.connection.db!;
    const uid = new mongoose.Types.ObjectId(loggedInUser.id);

    const accountRecord = await db.collection("account").findOne({ userId: uid, providerId: "credential" });
    if (accountRecord?.password) {
      if (!password) {
        return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
      }
      const isValid = await verifyPassword({ hash: accountRecord.password, password });
      if (!isValid) {
        return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
      }
    }

    const [user, profile] = await Promise.all([
      User.findById(uid).lean(),
      Profile.findOne({ userId: uid }).lean(),
    ]);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const wasBanned = profile?.banStatus === "banned";

    // Cancel any subscription still in a billable state — deletion isn't a
    // silent way to dodge the next renewal charge, and an active
    // subscription pointing at a deleted user would just be dead weight.
    await Subscription.updateOne(
      { subscriberId: uid, status: { $in: ["active", "trialing", "past_due", "paused"] } },
      {
        $set: { status: "cancelled", cancelledAt: new Date(), autoRenew: false },
        $push: { statusHistory: { status: "cancelled", changedAt: new Date(), reason: "Account deleted" } },
      }
    );

    const [hadSubscription, hadLounge] = await Promise.all([
      Subscription.exists({ subscriberId: uid }),
      Lounge.exists({ creatorId: uid }),
    ]);

    const membershipDays = user.createdAt
      ? Math.max(0, Math.round((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000))
      : 0;

    await DeletedAccount.create({
      originalUserId: uid,
      emailHash: crypto.createHash("sha256").update(user.email.toLowerCase()).digest("hex"),
      role: user.role,
      initiatedBy: "user",
      initiatedByUserId: uid,
      reason: typeof reason === "string" ? reason.slice(0, 1000) : undefined,
      wasBanned,
      blockReRegistration: wasBanned,
      recoveryEligible: !wasBanned,
      restorationSnapshot: {
        name: user.name || "",
        email: user.email,
        avatarUrl: profile?.profileImage?.url || user.image || undefined,
        username: profile?.username || "",
        interests: profile?.interests || [],
        role: user.role,
      },
      snapshot: {
        postsCount: profile?.postsCount || 0,
        followersCount: profile?.followersCount || 0,
        membershipDays,
        hadLounge: Boolean(hadLounge),
        hadSubscription: Boolean(hadSubscription),
      },
    });

    // Remove the identity-bearing records. Content (posts, comments, lounge
    // messages) is left in place — see the file-level comment above.
    await Promise.all([
      User.deleteOne({ _id: uid }),
      Profile.deleteOne({ userId: uid }),
      db.collection("account").deleteMany({ userId: uid }),
      db.collection("session").deleteMany({ userId: loggedInUser.id }),
    ]);

    return NextResponse.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    console.error("[POST /api/account/delete]", error);
    return NextResponse.json({ error: "Failed to delete account. Try again or contact support." }, { status: 500 });
  }
}

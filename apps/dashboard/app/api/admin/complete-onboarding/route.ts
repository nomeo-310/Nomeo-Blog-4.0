// app/api/admin/complete-onboarding/route.ts
import { NextResponse }       from "next/server";
import { getAuth }            from "@/lib/auth";
import { connectDB }          from "@/lib/connect-to-database";
import mongoose                from "mongoose";
import { hashPassword }       from "better-auth/crypto";
import { Admin }              from "@/models/admin";
import { AdminLog, AdminAction, AdminRole as LogAdminRole } from "@/models/admin-log";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["super_admin", "admin", "support"];

/**
 * Completes first-login setup for a newly created admin — sets their own
 * password, optionally updates display name/avatar, and flips
 * isActive/isOnboarded to true. Deliberately does NOT use
 * requireAdminUserFromRequest: that guard requires isActive === true, which
 * a pending admin doesn't have yet — this route's entire purpose is to grant it.
 * The seed phrase is untouched here; it does not change during onboarding.
 */
export async function POST(req: Request) {
  let body: { newPassword?: string; confirmPassword?: string; displayName?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { newPassword, confirmPassword } = body;
  const displayName = body.displayName?.trim();
  const avatar = body.avatar?.trim();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }
  if (displayName !== undefined && !displayName) {
    return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
  }

  try {
    await connectDB();

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = mongoose.connection.db!;
    const user = await db.collection("user").findOne({ _id: new mongoose.Types.ObjectId(session.user.id) });
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await Admin.findOne({ userId: user._id });
    if (!admin) return NextResponse.json({ error: "Admin record not found" }, { status: 404 });

    if (admin.isActive || admin.isOnboarded) {
      return NextResponse.json({ error: "This account has already completed onboarding" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await Promise.all([
      db.collection("account").updateOne(
        { userId: user._id, providerId: "credential" },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
      ),
      Admin.updateOne(
        { _id: admin._id },
        {
          $set: {
            isActive: true,
            isOnboarded: true,
            ...(displayName ? { displayName } : {}),
          },
        }
      ),
      avatar !== undefined
        ? db.collection("user").updateOne({ _id: user._id }, { $set: { avatar } })
        : Promise.resolve(),
    ]);

    await AdminLog.logAction({
      adminId:    String(admin._id),
      adminEmail: admin.email,
      adminName:  displayName || admin.displayName || admin.name,
      adminRole:  admin.role === "super_admin" ? LogAdminRole.SUPER_ADMIN : admin.role === "admin" ? LogAdminRole.ADMIN : LogAdminRole.SUPPORT,
      action:     AdminAction.UPDATE_ADMIN,
      details:    "completed first-login onboarding",
      ipAddress:  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      targetType: "admin",
      targetId:   String(admin._id),
      targetName: admin.email,
      reversible: false,
    });

    return NextResponse.json({ isActive: true, isOnboarded: true, displayName: displayName || admin.displayName, avatar });
  } catch (error) {
    console.error("[admin/complete-onboarding] failed:", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}

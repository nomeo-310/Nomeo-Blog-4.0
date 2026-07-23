// app/api/admin/users/[userId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import crypto                          from "crypto";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { Setting }                     from "@/models/setting";
import { Subscription }                from "@/models/subscription";
import { DeletedAccount }              from "@/models/deleted-account";
import { Notification }                from "@/models/notification";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

class UserActionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type UserAction = "temp_ban" | "permanent_ban" | "shadow_ban" | "unban" | "warn" | "verify_email";

const ACTION_PERMISSION: Partial<Record<UserAction, keyof IAdminPermissions>> = {
  temp_ban:       "canIssueTempBan",
  permanent_ban:  "canIssuePermanentBan",
  shadow_ban:     "canShadowBan",
  unban:          "canLiftBan",
  warn:           "canIssueWarning",
  // verify_email has no dedicated flag — any admin with baseline dashboard access can do it.
};

function hasPermission(admin: CurrentUser, flag?: keyof IAdminPermissions): boolean {
  if (!flag) return true;
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();

    const [user, profile, subscription, recentActions] = await Promise.all([
      User.findById(userId).lean(),
      Profile.findOne({ userId }).lean(),
      Subscription.findOne({ subscriberId: userId, status: { $in: ["active", "trialing", "past_due", "paused"] } }).lean(),
      AdminLog.getActionsByTarget("user", userId),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      user: {
        id:            String(user._id),
        name:          user.name,
        email:         user.email,
        emailVerified: user.emailVerified,
        role:          user.role,
        avatar:        user.avatar || profile?.profileImage?.url || "",
        createdAt:     user.createdAt,
      },
      profile: profile ? {
        username:        profile.username,
        displayName:     profile.displayName,
        bio:             profile.bio,
        profileImage:    profile.profileImage,
        coverImage:      profile.coverImage,
        location:        profile.location,
        banStatus:       profile.banStatus,
        banReason:       profile.banReason,
        bannedAt:        profile.bannedAt,
        banExpiresAt:    profile.banExpiresAt,
        creatorStatus:   profile.creatorStatus,
        becameCreatorAt: profile.becameCreatorAt,
        freeReadsRemaining: profile.freeReadsRemaining,
        followersCount:  profile.followersCount,
        followingCount:  profile.followingCount,
        postsCount:      profile.postsCount,
        savedPostsCount: profile.savedPostsCount,
        interests:       profile.interests,
        isPublic:        profile.isPublic,
      } : null,
      subscription: subscription ? {
        status: subscription.status,
        interval: subscription.interval,
        currentPeriodEnd: subscription.currentPeriodEnd,
        autoRenew: subscription.autoRenew,
      } : null,
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/users/:userId] failed to load user:", error);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: { action?: UserAction; reason?: string; banExpiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason, banExpiresAt } = body;
  const isValidAction = !!action && (action in ACTION_PERMISSION || action === "verify_email");
  if (!isValidAction) {
    return NextResponse.json(
      { error: "action must be one of temp_ban, permanent_ban, shadow_ban, unban, warn, verify_email" },
      { status: 400 }
    );
  }
  if (action !== "unban" && action !== "verify_email" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required for this action" }, { status: 400 });
  }
  if (action === "temp_ban" && !banExpiresAt) {
    return NextResponse.json({ error: "banExpiresAt is required for a temporary ban" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });

    const now = new Date();
    let adminAction: AdminAction;
    let notification: { type: "account_banned" | "account_unbanned" | "account_warned"; message: string } | null = null;

    switch (action) {
      case "temp_ban":
        profile.banStatus = "banned";
        profile.banReason = reason!.trim();
        profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
        profile.bannedAt = now;
        profile.banExpiresAt = new Date(banExpiresAt!);
        adminAction = AdminAction.BAN_USER;
        notification = { type: "account_banned", message: `Your account was temporarily suspended until ${profile.banExpiresAt.toDateString()}: ${reason!.trim()}` };
        break;
      case "permanent_ban":
        profile.banStatus = "banned";
        profile.banReason = reason!.trim();
        profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
        profile.bannedAt = now;
        profile.banExpiresAt = undefined;
        adminAction = AdminAction.BAN_USER;
        notification = { type: "account_banned", message: `Your account was permanently suspended: ${reason!.trim()}` };
        break;
      case "shadow_ban":
        profile.banStatus = "shadow_banned";
        profile.banReason = reason!.trim();
        profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
        profile.bannedAt = now;
        profile.banExpiresAt = undefined;
        adminAction = AdminAction.BAN_USER;
        break;
      case "unban":
        profile.banStatus = "active";
        profile.banReason = undefined;
        profile.bannedBy = undefined;
        profile.bannedAt = undefined;
        profile.banExpiresAt = undefined;
        adminAction = AdminAction.UNBAN_USER;
        notification = { type: "account_unbanned", message: "Your account access has been restored." };
        break;
      case "warn":
        adminAction = AdminAction.WARN_USER;
        notification = { type: "account_warned", message: `You received a warning from the Nomeo team: ${reason!.trim()}` };
        break;
      case "verify_email":
        user.emailVerified = true;
        adminAction = AdminAction.VERIFY_USER;
        break;
    }

    await Promise.all([profile.save(), user.save()]);

    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} on user "${user.name}" (${user.email})`,
      targetType: "user",
      targetId: String(user._id),
      targetName: user.name,
      reason,
      reversible: action !== "warn",
    });

    if (notification) {
      await Notification.create({
        recipientId: user._id,
        type:        notification.type,
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     notification.message,
        entityType:  "user",
        entityId:    user._id,
      });
    }

    return NextResponse.json({
      id: String(user._id),
      emailVerified: user.emailVerified,
      banStatus: profile.banStatus,
      banExpiresAt: profile.banExpiresAt ?? null,
    });
  } catch (error) {
    console.error("[admin/users/:userId] failed to moderate user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/**
 * Deletes a user account — creates a redacted DeletedAccount snapshot, then
 * removes the live User/Profile/Setting documents. Posts and comments are left
 * intact and attributed to the now-deleted user id (DeletedAccount exists
 * specifically to keep that attribution possible).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canDeleteUserAccount")) {
    return NextResponse.json({ error: "You do not have permission to delete a user account" }, { status: 403 });
  }

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: { reason?: string; confirmEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason, confirmEmail } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to delete a user account" }, { status: 400 });
  }

  try {
    await connectDB();

    const session = await mongoose.startSession();
    let deletedName = "";

    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        if (!user) throw new UserActionError(404, "User not found");
        if (confirmEmail !== user.email) {
          throw new UserActionError(400, "confirmEmail must match the user's email to confirm deletion");
        }

        const profile = await Profile.findOne({ userId: user._id }).session(session);
        const subscription = await Subscription.findOne({ subscriberId: user._id }).session(session);

        deletedName = user.name;
        const wasBanned = profile?.banStatus === "banned";
        const membershipDays = Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

        await DeletedAccount.create([{
          originalUserId: user._id,
          emailHash: crypto.createHash("sha256").update(user.email.toLowerCase()).digest("hex"),
          role: user.role,
          initiatedBy: "admin",
          initiatedByUserId: new mongoose.Types.ObjectId(admin.id),
          reason: reason.trim(),
          wasBanned,
          blockReRegistration: true,
          recoveryEligible: false,
          restorationSnapshot: null,
          snapshot: {
            postsCount:      profile?.postsCount ?? 0,
            followersCount:  profile?.followersCount ?? 0,
            membershipDays,
            hadLounge:       user.role === "creator",
            hadSubscription: !!subscription,
          },
        }], { session });

        await Promise.all([
          Profile.deleteOne({ userId: user._id }).session(session),
          Setting.deleteOne({ userId: user._id }).session(session),
          user.deleteOne({ session }),
        ]);
      });
    } finally {
      await session.endSession();
    }

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_USER,
      details: `deleted user account "${deletedName}"`,
      targetType: "user",
      targetId: userId,
      targetName: deletedName,
      reason,
      reversible: false,
    });

    return NextResponse.json({ id: userId, deleted: true });
  } catch (error) {
    if (error instanceof UserActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/users/:userId] failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

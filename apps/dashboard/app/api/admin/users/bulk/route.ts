// app/api/admin/users/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import crypto                          from "crypto";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { Setting }                     from "@/models/setting";
import { Subscription }                from "@/models/subscription";
import { DeletedAccount }              from "@/models/deleted-account";
import { Notification }                from "@/models/notification";
import { mailService }                 from "@/lib/mail-service";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type BulkUserAction = "temp_ban" | "permanent_ban" | "shadow_ban" | "unban" | "warn" | "verify_email" | "delete";

const ACTION_PERMISSION: Partial<Record<BulkUserAction, keyof IAdminPermissions>> = {
  temp_ban:      "canIssueTempBan",
  permanent_ban: "canIssuePermanentBan",
  shadow_ban:    "canShadowBan",
  unban:         "canLiftBan",
  warn:          "canIssueWarning",
  delete:        "canDeleteUserAccount",
};

function hasPermission(admin: CurrentUser, flag?: keyof IAdminPermissions): boolean {
  if (!flag) return true;
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

const MAX_BULK = 200;
const MAX_BULK_DELETE = 50;

export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; action?: BulkUserAction; reason?: string; banExpiresAt?: string; confirmText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason, banExpiresAt, confirmText } = body;
  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });

  if (!action || !(action in ACTION_PERMISSION) && action !== "verify_email") {
    return NextResponse.json(
      { error: "action must be one of temp_ban, permanent_ban, shadow_ban, unban, warn, verify_email, delete" },
      { status: 400 }
    );
  }
  if (!["unban", "verify_email"].includes(action) && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required for this action" }, { status: 400 });
  }
  if (action === "temp_ban" && !banExpiresAt) {
    return NextResponse.json({ error: "banExpiresAt is required for a temporary ban" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  if (action === "delete") {
    if (ids.length > MAX_BULK_DELETE) return NextResponse.json({ error: `Cannot delete more than ${MAX_BULK_DELETE} accounts at once` }, { status: 400 });
    if (confirmText !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm this bulk deletion" }, { status: 400 });
  } else if (ids.length > MAX_BULK) {
    return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} accounts at once` }, { status: 400 });
  }

  try {
    await connectDB();

    if (action === "delete") {
      let deleted = 0;
      const deletedRecipients: { email: string; name: string }[] = [];

      for (const userId of ids) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) return;

            const profile = await Profile.findOne({ userId: user._id }).session(session);
            const subscription = await Subscription.findOne({ subscriberId: user._id }).session(session);
            const membershipDays = Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

            await DeletedAccount.create([{
              originalUserId: user._id,
              emailHash: crypto.createHash("sha256").update(user.email.toLowerCase()).digest("hex"),
              role: user.role,
              initiatedBy: "admin",
              initiatedByUserId: new mongoose.Types.ObjectId(admin.id),
              reason: reason!.trim(),
              wasBanned: profile?.banStatus === "banned",
              blockReRegistration: true,
              recoveryEligible: false,
              restorationSnapshot: null,
              snapshot: {
                postsCount: profile?.postsCount ?? 0,
                followersCount: profile?.followersCount ?? 0,
                membershipDays,
                hadLounge: user.role === "creator",
                hadSubscription: !!subscription,
              },
            }], { session });

            deletedRecipients.push({ email: user.email, name: user.name });

            await Promise.all([
              Profile.deleteOne({ userId: user._id }).session(session),
              Setting.deleteOne({ userId: user._id }).session(session),
              user.deleteOne({ session }),
            ]);
          });
          deleted += 1;
        } finally {
          await session.endSession();
        }
      }

      await logAdminAction(req, admin, {
        action: AdminAction.DELETE_USER,
        details: `bulk-deleted ${deleted} user account(s)`,
        targetType: "user",
        reason,
        reversible: false,
        affectedCount: deleted,
      });

      await Promise.allSettled(
        deletedRecipients.map((r) =>
          mailService.deleteUser({ to: r.email, name: r.name, reason: reason!.trim(), deletionType: "hard", initiatedBy: admin.displayName || admin.name })
        )
      );

      return NextResponse.json({ requested: ids.length, deleted });
    }

    // Non-delete actions
    const users = await User.find({ _id: { $in: ids } });
    const profiles = await Profile.find({ userId: { $in: ids } });
    const profileByUserId = new Map(profiles.map((p) => [String(p.userId), p]));

    const now = new Date();
    let affected = 0;
    const notifications: { recipientId: mongoose.Types.ObjectId; type: string; message: string }[] = [];
    const emailJobs: Array<() => Promise<unknown>> = [];

    for (const user of users) {
      const profile = profileByUserId.get(String(user._id));
      if (!profile) continue;

      switch (action) {
        case "temp_ban":
          profile.banStatus = "banned";
          profile.banReason = reason!.trim();
          profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
          profile.bannedAt = now;
          profile.banExpiresAt = new Date(banExpiresAt!);
          notifications.push({ recipientId: user._id, type: "account_banned", message: `Your account was temporarily suspended until ${profile.banExpiresAt.toDateString()}: ${reason!.trim()}` });
          emailJobs.push(() => mailService.banUser({
            to: user.email, name: user.name, reason: reason!.trim(), isPermanent: false,
            durationDays: Math.max(1, Math.ceil((profile.banExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
            bannedBy: admin.displayName || admin.name, appealDeadline: profile.banExpiresAt.toDateString(),
          }));
          break;
        case "permanent_ban":
          profile.banStatus = "banned";
          profile.banReason = reason!.trim();
          profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
          profile.bannedAt = now;
          profile.banExpiresAt = undefined;
          notifications.push({ recipientId: user._id, type: "account_banned", message: `Your account was permanently suspended: ${reason!.trim()}` });
          emailJobs.push(() => mailService.banUser({ to: user.email, name: user.name, reason: reason!.trim(), isPermanent: true, bannedBy: admin.displayName || admin.name }));
          break;
        case "shadow_ban":
          profile.banStatus = "shadow_banned";
          profile.banReason = reason!.trim();
          profile.bannedBy = new mongoose.Types.ObjectId(admin.id);
          profile.bannedAt = now;
          profile.banExpiresAt = undefined;
          break;
        case "unban":
          profile.banStatus = "active";
          profile.banReason = undefined;
          profile.bannedBy = undefined;
          profile.bannedAt = undefined;
          profile.banExpiresAt = undefined;
          notifications.push({ recipientId: user._id, type: "account_unbanned", message: "Your account access has been restored." });
          emailJobs.push(() => mailService.unbanUser({ to: user.email, name: user.name, unbannedBy: admin.displayName || admin.name, note: reason }));
          break;
        case "warn":
          notifications.push({ recipientId: user._id, type: "account_warned", message: `You received a warning from the Nomeo team: ${reason!.trim()}` });
          emailJobs.push(() => mailService.warnUser({ to: user.email, name: user.name, reason: reason!.trim(), warnedBy: admin.displayName || admin.name }));
          break;
        case "verify_email":
          user.emailVerified = true;
          break;
      }

      affected += 1;
    }
    const adminAction: AdminAction = {
      temp_ban: AdminAction.BAN_USER, permanent_ban: AdminAction.BAN_USER, shadow_ban: AdminAction.BAN_USER,
      unban: AdminAction.UNBAN_USER, warn: AdminAction.WARN_USER, verify_email: AdminAction.VERIFY_USER,
    }[action];

    await Promise.all([
      ...profiles.map((p) => p.save()),
      ...users.map((u) => u.save()),
    ]);

    if (notifications.length) await Notification.insertMany(notifications.map((n) => ({ ...n, actorId: new mongoose.Types.ObjectId(admin.id) })));

    await logAdminAction(req, admin, {
      action: adminAction,
      details: `bulk ${action} on ${affected} user account(s)`,
      targetType: "user",
      reason,
      reversible: action !== "warn" && action !== "verify_email",
      affectedCount: affected,
    });

    await Promise.allSettled(emailJobs.map((job) => job().catch((err) => console.error("[admin/users/bulk] email failed:", err))));

    return NextResponse.json({ requested: ids.length, updated: affected });
  } catch (error) {
    console.error("[admin/users/bulk] failed to process bulk action:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}

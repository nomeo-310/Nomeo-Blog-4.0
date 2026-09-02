// app/api/admin/creators/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { Notification }                from "@/models/notification";
import { mailService }                 from "@/lib/mail-service";
import type { IAdminPermissions }      from "@/models/admin";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type CreatorAction = "suspend" | "reinstate" | "demote";

const ACTION_PERMISSION: Record<CreatorAction, keyof IAdminPermissions> = {
  suspend:   "canRejectCreatorApplication",
  reinstate: "canApproveCreatorApplication",
  demote:    "canRejectCreatorApplication",
};

const ADMIN_ACTION: Record<CreatorAction, AdminAction> = {
  suspend:   AdminAction.SUSPEND_CREATOR,
  reinstate: AdminAction.REINSTATE_CREATOR,
  demote:    AdminAction.DEMOTE_CREATOR,
};

const NOTIFICATION_TYPE: Record<CreatorAction, "creator_suspended" | "creator_reinstated" | "creator_demoted"> = {
  suspend:   "creator_suspended",
  reinstate: "creator_reinstated",
  demote:    "creator_demoted",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

const MAX_BULK = 200;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `creators-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; action?: CreatorAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} at once` }, { status: 400 });
  if (!action || !ACTION_PERMISSION[action]) {
    return NextResponse.json({ error: "action must be one of suspend, reinstate, demote" }, { status: 400 });
  }
  if (action !== "reinstate" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required for this action" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const users = await User.find({ _id: { $in: ids }, role: "creator" });
    const profiles = await Profile.find({ userId: { $in: users.map((u) => u._id) } });
    const profileByUserId = new Map(profiles.map((p) => [String(p.userId), p]));

    const now = new Date();
    let affected = 0;
    const notifications: { recipientId: mongoose.Types.ObjectId; type: string; message: string }[] = [];
    const emailJobs: Array<() => Promise<unknown>> = [];

    for (const user of users) {
      const profile = profileByUserId.get(String(user._id));
      if (!profile) continue;

      switch (action) {
        case "suspend":
          profile.creatorStatus = "suspended";
          profile.creatorSuspensionReason = reason!.trim();
          profile.creatorSuspendedBy = new mongoose.Types.ObjectId(admin.id);
          profile.creatorSuspendedAt = now;
          break;
        case "reinstate":
          profile.creatorStatus = "active";
          profile.creatorSuspensionReason = undefined;
          profile.creatorSuspendedBy = undefined;
          profile.creatorSuspendedAt = undefined;
          break;
        case "demote":
          user.role = "user";
          profile.creatorStatus = null;
          profile.creatorSuspensionReason = undefined;
          profile.creatorSuspendedBy = undefined;
          profile.creatorSuspendedAt = undefined;
          break;
      }

      notifications.push({
        recipientId: user._id,
        type: NOTIFICATION_TYPE[action],
        message: action === "suspend"
          ? `Your creator privileges were suspended${reason ? `: ${reason.trim()}` : "."}`
          : action === "reinstate"
            ? "Your creator privileges have been reinstated."
            : `Your account was changed back to a reader account${reason ? `: ${reason.trim()}` : "."}`,
      });
      emailJobs.push(() => mailService.creatorStatusChange({ to: user.email, name: user.name, action, reason, performedBy: admin.displayName || admin.name }));

      affected += 1;
    }

    await Promise.all([
      ...profiles.map((p) => p.save()),
      ...users.map((u) => u.save()),
    ]);

    if (notifications.length) {
      await Notification.insertMany(notifications.map((n) => ({ ...n, actorId: new mongoose.Types.ObjectId(admin.id) })));
    }

    await logAdminAction(req, admin, {
      action: ADMIN_ACTION[action],
      details: `bulk ${action} on ${affected} creator(s)`,
      targetType: "user",
      reason,
      reversible: action !== "demote",
      affectedCount: affected,
    });

    await Promise.allSettled(emailJobs.map((job) => job().catch((err) => console.error("[admin/creators/bulk] email failed:", err))));

    return NextResponse.json({ requested: ids.length, updated: affected });
  } catch (error) {
    console.error("[admin/creators/bulk] failed to process bulk action:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}

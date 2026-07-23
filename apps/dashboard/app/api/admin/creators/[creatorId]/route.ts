// app/api/admin/creators/[creatorId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { CreatorEarning }              from "@/models/creator-earning";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type CreatorAction = "suspend" | "reinstate" | "demote";

/**
 * No permission flag exists specifically for suspending/reinstating a standing
 * creator — canApprove/RejectCreatorApplication govern the application queue,
 * but taking privileges away from (or restoring) an existing creator is the
 * same trust decision in spirit, so the closest modeled flags are reused here
 * rather than inventing new ones. Demotion, the most permanent of the three,
 * shares the reject flag — which support accounts don't hold by default.
 */
const ACTION_PERMISSION: Record<CreatorAction, keyof IAdminPermissions> = {
  suspend:   "canRejectCreatorApplication",
  reinstate: "canApproveCreatorApplication",
  demote:    "canRejectCreatorApplication",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  try {
    await connectDB();

    const [user, profile, recentEarnings, recentActions] = await Promise.all([
      User.findById(creatorId).lean(),
      Profile.findOne({ userId: creatorId }).lean(),
      CreatorEarning.find({ creatorId }).sort({ billingPeriod: -1 }).limit(6).lean(),
      AdminLog.getActionsByTarget("user", creatorId),
    ]);

    if (!user || user.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    return NextResponse.json({
      creator: {
        id:    String(user._id),
        name:  user.name,
        email: user.email,
        avatar: user.avatar || profile?.profileImage?.url || "",
        createdAt: user.createdAt,
      },
      profile: profile ? {
        username:        profile.username,
        displayName:     profile.displayName,
        bio:             profile.bio,
        about:           profile.about,
        profileImage:    profile.profileImage,
        coverImage:      profile.coverImage,
        banStatus:       profile.banStatus,
        creatorStatus:   profile.creatorStatus,
        creatorSuspensionReason: profile.creatorSuspensionReason,
        creatorSuspendedAt:      profile.creatorSuspendedAt,
        becameCreatorAt: profile.becameCreatorAt,
        followersCount:  profile.followersCount,
        followingCount:  profile.followingCount,
        postsCount:      profile.postsCount,
        creatorTopics:   profile.creatorTopics,
      } : null,
      recentEarnings: recentEarnings.map((e) => ({
        id: String(e._id),
        billingPeriod: e.billingPeriod,
        grossAmount: e.grossAmount,
        netAmount: e.netAmount,
        currency: e.currency,
        payoutStatus: e.payoutStatus,
      })),
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/creators/:creatorId] failed to load creator:", error);
    return NextResponse.json({ error: "Failed to load creator" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  let body: { action?: CreatorAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
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

    const user = await User.findById(creatorId);
    if (!user || user.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) return NextResponse.json({ error: "Profile not found for this creator" }, { status: 404 });

    const now = new Date();
    let adminAction: AdminAction;

    switch (action) {
      case "suspend":
        profile.creatorStatus = "suspended";
        profile.creatorSuspensionReason = reason!.trim();
        profile.creatorSuspendedBy = new mongoose.Types.ObjectId(admin.id);
        profile.creatorSuspendedAt = now;
        adminAction = AdminAction.SUSPEND_CREATOR;
        break;
      case "reinstate":
        profile.creatorStatus = "active";
        profile.creatorSuspensionReason = undefined;
        profile.creatorSuspendedBy = undefined;
        profile.creatorSuspendedAt = undefined;
        adminAction = AdminAction.REINSTATE_CREATOR;
        break;
      case "demote":
        user.role = "user";
        profile.creatorStatus = null;
        profile.creatorSuspensionReason = undefined;
        profile.creatorSuspendedBy = undefined;
        profile.creatorSuspendedAt = undefined;
        adminAction = AdminAction.DEMOTE_CREATOR;
        break;
    }

    await Promise.all([profile.save(), user.save()]);

    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} creator "${user.name}" (${user.email})`,
      targetType: "user",
      targetId: String(user._id),
      targetName: user.name,
      reason,
      reversible: action !== "demote",
    });

    return NextResponse.json({
      id: String(user._id),
      role: user.role,
      creatorStatus: profile.creatorStatus,
    });
  } catch (error) {
    console.error("[admin/creators/:creatorId] failed to moderate creator:", error);
    return NextResponse.json({ error: "Failed to update creator" }, { status: 500 });
  }
}

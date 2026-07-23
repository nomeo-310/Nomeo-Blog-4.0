// app/api/admin/creators/applications/[applicationId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { CreatorApplication }          from "@/models/creator-application";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { Notification }                from "@/models/notification";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type ReviewAction = "approve" | "reject";

const ACTION_PERMISSION: Record<ReviewAction, keyof IAdminPermissions> = {
  approve: "canApproveCreatorApplication",
  reject:  "canRejectCreatorApplication",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  let body: { action?: ReviewAction; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, note } = body;
  if (!action || !ACTION_PERMISSION[action]) {
    return NextResponse.json({ error: "action must be one of approve, reject" }, { status: 400 });
  }
  if (action === "reject" && !note?.trim()) {
    return NextResponse.json({ error: "A note is required to reject an application" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const application = await CreatorApplication.findById(applicationId);
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (application.status !== "pending") {
      return NextResponse.json({ error: "This application has already been reviewed" }, { status: 400 });
    }

    const now = new Date();
    application.status = action === "approve" ? "approved" : "rejected";
    application.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    application.reviewNote = note?.trim() || undefined;
    application.reviewedAt = now;
    await application.save();

    if (action === "approve") {
      const user = await User.findById(application.userId);
      if (!user) return NextResponse.json({ error: "Applicant account no longer exists" }, { status: 404 });

      user.role = "creator";
      await user.save();

      await Profile.updateOne(
        { userId: application.userId },
        {
          $set: {
            creatorStatus: "active",
            becameCreatorAt: now,
            creatorTopics: application.writingTopics
              ? application.writingTopics.split(",").map((t: string) => t.trim()).filter(Boolean)
              : [],
          },
        }
      );
    }

    await logAdminAction(req, admin, {
      action: action === "approve" ? AdminAction.APPROVE_CREATOR_APPLICATION : AdminAction.REJECT_CREATOR_APPLICATION,
      details: `${action}d creator application`,
      targetType: "creator_application",
      targetId: String(application._id),
      reason: note,
      reversible: false,
    });

    if (action === "approve") {
      await Notification.create({
        recipientId: application.userId,
        type:        "creator_upgrade_successful",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     "Your creator application was approved. You can now publish posts on Nomeo.",
        entityType:  "user",
        entityId:    application.userId,
      });
    }

    return NextResponse.json({
      id: String(application._id),
      status: application.status,
    });
  } catch (error) {
    console.error("[admin/creators/applications/:applicationId] failed to review application:", error);
    return NextResponse.json({ error: "Failed to review application" }, { status: 500 });
  }
}

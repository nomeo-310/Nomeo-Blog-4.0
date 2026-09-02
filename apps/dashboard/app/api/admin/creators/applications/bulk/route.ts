// app/api/admin/creators/applications/bulk/route.ts
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
import { mailService }                 from "@/lib/mail-service";
import type { IAdminPermissions }      from "@/models/admin";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type ReviewAction = "approve" | "reject";

const ACTION_PERMISSION: Record<ReviewAction, keyof IAdminPermissions> = {
  approve: "canApproveCreatorApplication",
  reject:  "canRejectCreatorApplication",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

const MAX_BULK = 100;

/**
 * Mirrors PATCH /api/admin/creators/applications/[applicationId] — same
 * per-application effects (role/profile change on approve, notification,
 * result email), just applied over a set and logged as one AdminLog entry
 * instead of one per application.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `applications-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; action?: ReviewAction; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, note } = body;
  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} applications at once` }, { status: 400 });

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

    const applications = await CreatorApplication.find({ _id: { $in: ids }, status: "pending" });
    if (applications.length === 0) {
      return NextResponse.json({ error: "None of the selected applications are still pending" }, { status: 400 });
    }

    const now = new Date();
    const applicantIds = applications.map((a) => a.userId);
    const applicants = await User.find({ _id: { $in: applicantIds } });
    const applicantById = new Map(applicants.map((u) => [String(u._id), u]));

    const notifications: { recipientId: mongoose.Types.ObjectId; type: string; actorId: mongoose.Types.ObjectId; message: string; entityType: "user"; entityId: mongoose.Types.ObjectId }[] = [];
    const emailJobs: Array<() => Promise<unknown>> = [];
    let affected = 0;

    for (const application of applications) {
      const applicant = applicantById.get(String(application.userId));
      if (action === "approve" && !applicant) continue; // applicant account no longer exists — skip

      application.status = action === "approve" ? "approved" : "rejected";
      application.reviewedBy = new mongoose.Types.ObjectId(admin.id);
      application.reviewNote = note?.trim() || undefined;
      application.reviewedAt = now;

      if (action === "approve" && applicant) {
        applicant.role = "creator";
      }

      notifications.push({
        recipientId: application.userId,
        type: action === "approve" ? "creator_upgrade_successful" : "creator_application_rejected",
        actorId: new mongoose.Types.ObjectId(admin.id),
        message: action === "approve"
          ? "Your creator application was approved. You can now publish posts on QuilHub."
          : `Your creator application was not approved${note ? `: ${note.trim()}` : "."}`,
        entityType: "user",
        entityId: application.userId,
      });

      if (applicant) {
        emailJobs.push(() => mailService.creatorApplicationResult({
          to: applicant.email, name: applicant.name,
          approved: action === "approve",
          reason: action === "reject" ? note : undefined,
          canReapply: true,
        }));
      }

      affected += 1;
    }

    await Promise.all([
      ...applications.map((a) => a.save()),
      ...(action === "approve" ? applicants.map((u) => u.save()) : []),
    ]);

    if (action === "approve") {
      await Promise.all(applications.map((a) =>
        Profile.updateOne(
          { userId: a.userId },
          {
            $set: {
              creatorStatus: "active",
              becameCreatorAt: now,
              creatorTopics: a.writingTopics
                ? a.writingTopics.split(",").map((t: string) => t.trim()).filter(Boolean)
                : [],
            },
          }
        )
      ));
    }

    if (notifications.length) await Notification.insertMany(notifications);

    await logAdminAction(req, admin, {
      action: action === "approve" ? AdminAction.APPROVE_CREATOR_APPLICATION : AdminAction.REJECT_CREATOR_APPLICATION,
      details: `bulk ${action}d ${affected} creator application(s)`,
      targetType: "creator_application",
      reason: note,
      reversible: false,
      affectedCount: affected,
    });

    await Promise.allSettled(emailJobs.map((job) => job().catch((err) => console.error("[admin/creators/applications/bulk] email failed:", err))));

    return NextResponse.json({ requested: ids.length, updated: affected });
  } catch (error) {
    console.error("[admin/creators/applications/bulk] failed to process bulk review:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}

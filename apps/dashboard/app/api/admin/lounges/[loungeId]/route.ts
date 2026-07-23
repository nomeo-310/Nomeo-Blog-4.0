// app/api/admin/lounges/[loungeId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { Lounge, LoungeMember, LoungeMessage } from "@/models/lounge";
import { Notification }                from "@/models/notification";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type ModerationAction = "suspend" | "reinstate";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

class LoungeDeleteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const lounge = await Lounge.findById(loungeId).lean();
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });

    const peopleIds = [
      ...(lounge.creatorId ? [lounge.creatorId] : []),
      ...(lounge.suspendedBy ? [lounge.suspendedBy] : []),
      ...lounge.bannedMembers,
    ];

    const [people, memberStatusRows, recentActions] = await Promise.all([
      peopleIds.length
        ? db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
        : [],
      db.collection("lounge_members").aggregate([
        { $match: { loungeId: lounge._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
      AdminLog.getActionsByTarget("lounge", loungeId),
    ]);

    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      lounge: {
        id: String(lounge._id),
        name: lounge.name, description: lounge.description,
        kind: lounge.kind, accessType: lounge.accessType,
        creator: lounge.creatorId ? { id: String(lounge.creatorId), ...personOrUnknown(lounge.creatorId) } : null,
        status: lounge.status, isMuted: lounge.isMuted,
        isSuspended: lounge.isSuspended,
        suspendedBy: lounge.suspendedBy ? personOrUnknown(lounge.suspendedBy) : null,
        suspendedAt: lounge.suspendedAt, suspensionReason: lounge.suspensionReason,
        rules: lounge.rules,
        slowModeSeconds: lounge.slowModeSeconds, maxMessageLength: lounge.maxMessageLength,
        membersCount: lounge.membersCount, messagesCount: lounge.messagesCount,
        bannedMembers: (lounge.bannedMembers as mongoose.Types.ObjectId[]).map((id) => ({ id: String(id), ...personOrUnknown(id) })),
        createdAt: lounge.createdAt, updatedAt: lounge.updatedAt,
      },
      memberStats: Object.fromEntries(
        (memberStatusRows as { _id: string; count: number }[]).map((r) => [r._id, r.count])
      ),
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId] failed to load lounge:", error);
    return NextResponse.json({ error: "Failed to load lounge" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  let body: { action?: ModerationAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "suspend" && action !== "reinstate") {
    return NextResponse.json({ error: "action must be one of suspend, reinstate" }, { status: 400 });
  }
  if (action === "suspend" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to suspend a lounge" }, { status: 400 });
  }
  if (!hasPermission(admin, "canSuspendLounge")) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const lounge = await Lounge.findById(loungeId);
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });

    if (action === "suspend") {
      lounge.isSuspended = true;
      lounge.status = "suspended";
      lounge.suspendedBy = new mongoose.Types.ObjectId(admin.id);
      lounge.suspendedAt = new Date();
      lounge.suspensionReason = reason!.trim();
    } else {
      lounge.isSuspended = false;
      if (lounge.status === "suspended") lounge.status = "active";
      lounge.suspendedBy = undefined;
      lounge.suspendedAt = undefined;
      lounge.suspensionReason = undefined;
    }
    await lounge.save();

    await logAdminAction(req, admin, {
      action: action === "suspend" ? AdminAction.SUSPEND_LOUNGE : AdminAction.RESTORE_LOUNGE,
      details: `${action} lounge "${lounge.name}"`,
      targetType: "lounge",
      targetId: String(lounge._id),
      targetName: lounge.name,
      reason,
      reversible: true,
    });

    if (action === "suspend" && lounge.creatorId) {
      await Notification.create({
        recipientId: lounge.creatorId,
        type:        "lounge_suspended",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     `Your lounge "${lounge.name}" was suspended: ${reason!.trim()}`,
        entityType:  "lounge",
        entityId:    lounge._id,
      });
    }

    return NextResponse.json({
      id: String(lounge._id),
      status: lounge.status,
      isSuspended: lounge.isSuspended,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId] failed to moderate lounge:", error);
    return NextResponse.json({ error: "Failed to update lounge" }, { status: 500 });
  }
}

/**
 * Permanently deletes a lounge — irreversible. Cascades to its members and
 * messages, since neither has any meaning without the lounge they belong to.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canDeleteLounge")) {
    return NextResponse.json({ error: "You do not have permission to delete a lounge" }, { status: 403 });
  }

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  let body: { reason?: string; confirmName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason, confirmName } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to permanently delete a lounge" }, { status: 400 });
  }

  try {
    await connectDB();

    const session = await mongoose.startSession();
    let deletedName = "";
    let deletedCreatorId: mongoose.Types.ObjectId | null = null;

    try {
      await session.withTransaction(async () => {
        const lounge = await Lounge.findById(loungeId).session(session);
        if (!lounge) throw new LoungeDeleteError(404, "Lounge not found");
        if (confirmName !== lounge.name) {
          throw new LoungeDeleteError(400, "confirmName must match the lounge's name to confirm permanent deletion");
        }

        deletedName = lounge.name;
        deletedCreatorId = lounge.creatorId ?? null;

        await Promise.all([
          LoungeMember.deleteMany({ loungeId: lounge._id }).session(session),
          LoungeMessage.deleteMany({ loungeId: lounge._id }).session(session),
        ]);

        await lounge.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_LOUNGE,
      details: `permanently deleted lounge "${deletedName}"`,
      targetType: "lounge",
      targetId: loungeId,
      targetName: deletedName,
      reason,
      reversible: false,
    });

    if (deletedCreatorId) {
      await Notification.create({
        recipientId: deletedCreatorId,
        type:        "lounge_suspended",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     `Your lounge "${deletedName}" was permanently deleted: ${reason.trim()}`,
        entityType:  "lounge",
        entityId:    new mongoose.Types.ObjectId(loungeId),
      });
    }

    return NextResponse.json({ id: loungeId, deleted: true });
  } catch (error) {
    if (error instanceof LoungeDeleteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/lounges/:loungeId] failed to hard-delete lounge:", error);
    return NextResponse.json({ error: "Failed to delete lounge" }, { status: 500 });
  }
}

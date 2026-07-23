// app/api/admin/lounges/[loungeId]/members/[memberId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Lounge, LoungeMember }        from "@/models/lounge";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type MemberAction = "ban" | "unban";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loungeId: string; memberId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId, memberId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: MemberAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "ban" && action !== "unban") {
    return NextResponse.json({ error: "action must be one of ban, unban" }, { status: 400 });
  }
  if (action === "ban" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to ban a member" }, { status: 400 });
  }
  if (!hasPermission(admin, "canSuspendLounge")) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const member = await LoungeMember.findOne({ _id: memberId, loungeId });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (action === "ban") {
      const wasAccepted = member.status === "accepted";
      member.status = "removed";
      await member.save();

      await Lounge.updateOne(
        { _id: loungeId },
        {
          $addToSet: { bannedMembers: member.userId },
          ...(wasAccepted ? { $inc: { membersCount: -1 } } : {}),
        }
      );
    } else {
      await Lounge.updateOne({ _id: loungeId }, { $pull: { bannedMembers: member.userId } });
    }

    await logAdminAction(req, admin, {
      action: action === "ban" ? AdminAction.BAN_LOUNGE_MEMBER : AdminAction.UNBAN_LOUNGE_MEMBER,
      details: `${action} member ${member.userId} in lounge ${loungeId}`,
      targetType: "lounge",
      targetId: loungeId,
      reason,
      reversible: true,
    });

    return NextResponse.json({
      id: String(member._id),
      userId: String(member.userId),
      action,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/members/:memberId] failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

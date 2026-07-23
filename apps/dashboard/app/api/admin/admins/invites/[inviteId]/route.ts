// app/api/admin/admins/invites/[inviteId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { AdminInvite }                 from "@/models/admin-invite";

export const dynamic = "force-dynamic";

function hasPermission(admin: { isSuperAdmin: boolean; permissions: { canInviteAdmin: boolean } | null }): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.canInviteAdmin;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin)) {
    return NextResponse.json({ error: "You do not have permission to revoke an admin invite" }, { status: 403 });
  }

  const { inviteId } = await params;
  if (!mongoose.Types.ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  let body: { action?: "revoke" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "revoke") {
    return NextResponse.json({ error: "action must be 'revoke'" }, { status: 400 });
  }

  try {
    await connectDB();

    const invite = await AdminInvite.findById(inviteId);
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Only a pending invite can be revoked" }, { status: 400 });
    }

    invite.status = "revoked";
    await invite.save();

    await logAdminAction(req, admin, {
      action: AdminAction.REVOKE_ADMIN_INVITE,
      details: `revoked admin invite for ${invite.email}`,
      targetType: "admin",
      targetId: String(invite._id),
      targetName: invite.email,
      reversible: false,
    });

    return NextResponse.json({ id: String(invite._id), status: invite.status });
  } catch (error) {
    console.error("[admin/admins/invites/:inviteId] failed to revoke invite:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
}

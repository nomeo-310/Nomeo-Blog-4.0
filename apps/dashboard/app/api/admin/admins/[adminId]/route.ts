// app/api/admin/admins/[adminId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { Admin, defaultPermissions, type AdminRole, type IAdminPermissions } from "@/models/admin";

export const dynamic = "force-dynamic";

class AdminActionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type AdminAdminAction = "update_role" | "suspend" | "activate" | "update_permissions";
const ROLES: AdminRole[] = ["support", "admin", "super_admin"];

/**
 * Every mutation here (role changes, suspension, permission grants) touches
 * another admin's standing on the dashboard — per the model's own comment,
 * admin management is "super_admin only in practice", so all of it is
 * hardcoded to super_admin rather than gated behind a grantable flag.
 */
async function assertNotLastSuperAdmin(currentAdminId: string, excludeId?: string) {
  const activeSuperAdminCount = await Admin.countDocuments({
    role: "super_admin",
    adminStatus: "active",
    _id: { $ne: excludeId ?? currentAdminId },
  });
  if (activeSuperAdminCount === 0) {
    throw new AdminActionError(400, "Cannot proceed — this is the last active super admin");
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { adminId } = await params;
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
  }

  try {
    await connectDB();

    const [target, recentActions] = await Promise.all([
      Admin.findById(adminId).lean(),
      AdminLog.getActionsByTarget("admin", adminId),
    ]);

    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    return NextResponse.json({
      admin: {
        id: String(target._id),
        name: target.name,
        displayName: target.displayName,
        email: target.email,
        role: target.role,
        adminStatus: target.adminStatus,
        isActive: target.isActive,
        isOnboarded: target.isOnboarded,
        department: target.department,
        internalNotes: target.internalNotes,
        permissions: target.permissions,
        stats: target.stats,
        dashboardNotifications: target.dashboardNotifications,
        suspendedAt: target.suspendedAt,
        suspensionReason: target.suspensionReason,
        loginCount: target.loginCount,
        lastLoginAt: target.lastLoginAt,
        lastLoginIP: target.lastLoginIP,
        createdAt: target.createdAt,
      },
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/admins/:adminId] failed to load admin:", error);
    return NextResponse.json({ error: "Failed to load admin" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can manage other admins" }, { status: 403 });
  }

  const { adminId } = await params;
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
  }

  let body: {
    action?: AdminAdminAction;
    reason?: string;
    role?: AdminRole;
    permissions?: Partial<IAdminPermissions>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason, role, permissions } = body;
  if (!action || !["update_role", "suspend", "activate", "update_permissions"].includes(action)) {
    return NextResponse.json({ error: "action must be one of update_role, suspend, activate, update_permissions" }, { status: 400 });
  }
  if (action === "suspend" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to suspend an admin" }, { status: 400 });
  }
  if (action === "update_role" && (!role || !ROLES.includes(role))) {
    return NextResponse.json({ error: "role must be one of support, admin, super_admin" }, { status: 400 });
  }
  if (action === "update_permissions" && (!permissions || typeof permissions !== "object")) {
    return NextResponse.json({ error: "permissions object is required" }, { status: 400 });
  }
  if (adminId === admin.adminId && (action === "suspend" || action === "update_role")) {
    return NextResponse.json({ error: "You cannot change your own role or suspend yourself" }, { status: 400 });
  }

  try {
    await connectDB();

    const target = await Admin.findById(adminId);
    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    if (target.role === "super_admin" && (action === "suspend" || (action === "update_role" && role !== "super_admin"))) {
      await assertNotLastSuperAdmin(admin.adminId, adminId);
    }

    let adminAction: AdminAction;
    let details: string;

    switch (action) {
      case "update_role":
        details = `changed ${target.email}'s role from ${target.role} to ${role}`;
        target.role = role!;
        target.permissions = defaultPermissions(role!);
        adminAction = AdminAction.UPDATE_ADMIN_ROLE;
        break;
      case "suspend":
        target.adminStatus = "suspended";
        target.isActive = false;
        target.suspendedBy = new mongoose.Types.ObjectId(admin.id);
        target.suspendedAt = new Date();
        target.suspensionReason = reason!.trim();
        details = `suspended admin ${target.email}`;
        adminAction = AdminAction.SUSPEND_ADMIN;
        break;
      case "activate":
        target.adminStatus = "active";
        target.isActive = true;
        target.suspendedBy = undefined;
        target.suspendedAt = undefined;
        target.suspensionReason = undefined;
        details = `reactivated admin ${target.email}`;
        adminAction = AdminAction.ACTIVATE_ADMIN;
        break;
      case "update_permissions":
        target.permissions = { ...target.permissions, ...permissions } as IAdminPermissions;
        details = `updated permissions for admin ${target.email}`;
        adminAction = AdminAction.UPDATE_ADMIN;
        break;
    }

    await target.save();

    await logAdminAction(req, admin, {
      action: adminAction,
      details,
      targetType: "admin",
      targetId: String(target._id),
      targetName: target.email,
      reason,
      reversible: action !== "update_role",
    });

    return NextResponse.json({
      id: String(target._id),
      role: target.role,
      adminStatus: target.adminStatus,
      isActive: target.isActive,
      permissions: target.permissions,
    });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/admins/:adminId] failed to update admin:", error);
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
  }
}

/**
 * Removes an admin's dashboard access entirely — deletes the Admin document.
 * The underlying platform User account is untouched (they simply become a
 * regular "user" the next time role is checked, since Admin is the source of
 * dashboard authority, not User.role).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can remove another admin" }, { status: 403 });
  }

  const { adminId } = await params;
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return NextResponse.json({ error: "Invalid admin id" }, { status: 400 });
  }

  if (adminId === admin.adminId) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }

  let body: { reason?: string; confirmEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason, confirmEmail } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to remove an admin" }, { status: 400 });
  }

  try {
    await connectDB();

    const target = await Admin.findById(adminId);
    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    if (confirmEmail !== target.email) {
      return NextResponse.json({ error: "confirmEmail must match the admin's email to confirm removal" }, { status: 400 });
    }

    if (target.role === "super_admin") {
      await assertNotLastSuperAdmin(admin.adminId, adminId);
    }

    const targetEmail = target.email;
    await target.deleteOne();

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_ADMIN,
      details: `removed admin access for ${targetEmail}`,
      targetType: "admin",
      targetId: adminId,
      targetName: targetEmail,
      reason,
      reversible: false,
    });

    return NextResponse.json({ id: adminId, deleted: true });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/admins/:adminId] failed to delete admin:", error);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}

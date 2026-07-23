// app/api/admin/admins/invites/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import crypto                          from "crypto";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { AdminInvite, type AdminInviteStatus } from "@/models/admin-invite";
import { Admin, type AdminRole }       from "@/models/admin";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

const STATUSES: AdminInviteStatus[] = ["pending", "accepted", "expired", "revoked"];
const ROLES: AdminRole[] = ["support", "admin", "super_admin"];

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "all";
    const status = STATUSES.includes(statusParam as AdminInviteStatus) ? statusParam : "all";
    const page  = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = status === "all" ? {} : { status };

    const [invites, total] = await Promise.all([
      AdminInvite.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminInvite.countDocuments(match),
    ]);

    const peopleIds = [
      ...invites.map((i) => i.invitedBy),
      ...invites.filter((i) => i.acceptedByUserId).map((i) => i.acceptedByUserId!),
    ];
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      filters: { status },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      invites: invites.map((i) => ({
        id: String(i._id),
        invitedBy: { id: String(i.invitedBy), ...personOrUnknown(i.invitedBy) },
        email: i.email,
        role: i.role,
        department: i.department,
        personalMessage: i.personalMessage,
        status: i.status,
        acceptedAt: i.acceptedAt,
        acceptedBy: i.acceptedByUserId ? { id: String(i.acceptedByUserId), ...personOrUnknown(i.acceptedByUserId) } : null,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/admins/invites] failed to list invites:", error);
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canInviteAdmin")) {
    return NextResponse.json({ error: "You do not have permission to invite an admin" }, { status: 403 });
  }

  let body: { email?: string; role?: AdminRole; department?: string; personalMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!body.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ error: "role must be one of support, admin, super_admin" }, { status: 400 });
  }
  if (body.role === "super_admin" && !admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can invite another super admin" }, { status: 403 });
  }

  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json({ error: "This email already belongs to an admin" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invite = await AdminInvite.create({
      invitedBy: new mongoose.Types.ObjectId(admin.id),
      email,
      role: body.role,
      department: body.department?.trim() || undefined,
      personalMessage: body.personalMessage?.trim() || undefined,
      token,
    });

    await logAdminAction(req, admin, {
      action: AdminAction.CREATE_ADMIN,
      details: `invited ${email} to join as ${body.role}`,
      targetType: "admin",
      targetId: String(invite._id),
      targetName: email,
      reversible: true,
    });

    return NextResponse.json(
      { id: String(invite._id), email: invite.email, role: invite.role, status: invite.status, expiresAt: invite.expiresAt },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A pending invite already exists for this email" }, { status: 409 });
    }
    console.error("[admin/admins/invites] failed to create invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

// app/api/admin/admins/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import mongoose                        from "mongoose";
import crypto                          from "crypto";
import { Admin, type AdminRole, type AdminStatus, type IAdminPermissions } from "@/models/admin";
import { escapeRegExp }                from "@/lib/utils";
import { createAdminUser }             from "@/lib/create-admin";
import { AdminInvite }                 from "@/models/admin-invite";

export const dynamic = "force-dynamic";

const ROLES: AdminRole[] = ["support", "admin", "super_admin"];
const STATUSES: AdminStatus[] = ["active", "suspended", "inactive"];
const DEPARTMENTS = ["content", "trust_and_safety", "growth", "engineering", "support", "other"] as const;

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;

    const roleParam   = params.get("role") ?? "all";
    const role        = ROLES.includes(roleParam as AdminRole) ? roleParam : "all";
    const statusParam = params.get("adminStatus") ?? "all";
    const adminStatus = STATUSES.includes(statusParam as AdminStatus) ? statusParam : "all";
    const search      = params.get("search")?.trim();
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (role !== "all") match.role = role;
    if (adminStatus !== "all") match.adminStatus = adminStatus;
    if (search) {
      match.$or = [
        { name:  { $regex: escapeRegExp(search), $options: "i" } },
        { email: { $regex: escapeRegExp(search), $options: "i" } },
      ];
    }

    const [rows, total] = await Promise.all([
      Admin.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Admin.countDocuments(match),
    ]);

    return NextResponse.json({
      filters: { role, adminStatus, search },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      admins: rows.map((a) => ({
        id: String(a._id),
        name: a.name,
        displayName: a.displayName,
        email: a.email,
        role: a.role,
        adminStatus: a.adminStatus,
        isActive: a.isActive,
        isOnboarded: a.isOnboarded,
        department: a.department,
        loginCount: a.loginCount,
        lastLoginAt: a.lastLoginAt,
        stats: a.stats,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/admins] failed to list admins:", error);
    return NextResponse.json({ error: "Failed to load admins" }, { status: 500 });
  }
}

/**
 * Provisions a new admin account immediately — creates the Better Auth user,
 * credential account, Admin document, and Seedphrase record, then emails the
 * temp password + seed phrase (see lib/create-admin.ts). The account starts
 * with isActive: false / isOnboarded: false until they complete first-login
 * setup, so the list can distinguish "invited, not yet accepted" from active.
 */
export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canInviteAdmin")) {
    return NextResponse.json({ error: "You do not have permission to add an admin" }, { status: 403 });
  }

  let body: {
    email?: string;
    name?: string;
    displayName?: string;
    department?: (typeof DEPARTMENTS)[number];
    role?: AdminRole;
    personalMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const displayName = body.displayName?.trim() || name;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 });
  }
  if (!body.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ error: "role must be one of support, admin, super_admin" }, { status: 400 });
  }
  if (body.role === "super_admin" && !admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can add another super admin" }, { status: 403 });
  }
  if (!body.department || !DEPARTMENTS.includes(body.department)) {
    return NextResponse.json({ error: `department must be one of ${DEPARTMENTS.join(", ")}` }, { status: 400 });
  }

  try {
    await connectDB();

    const personalMessage = body.personalMessage?.trim() || undefined;

    const result = await createAdminUser({
      email,
      name,
      displayName: displayName!,
      department: body.department,
      role: body.role,
      createdById: admin.adminId,
      createdByName: admin.displayName || admin.name,
      createdByEmail: admin.email,
      personalMessage,
    });

    // Permanent history record of who onboarded whom, when, and with what note —
    // distinct from the generic AdminLog audit trail, kept indefinitely (unlike a
    // pending invite's 7-day TTL) since the account is created immediately, not
    // pending acceptance. expiresAt is pushed out far beyond the schema's TTL
    // index so this record isn't auto-purged like a real pending invite would be.
    await AdminInvite.create({
      invitedBy: new mongoose.Types.ObjectId(admin.id),
      email,
      role: body.role,
      department: body.department,
      personalMessage,
      token: crypto.randomBytes(32).toString("hex"),
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: new mongoose.Types.ObjectId(result.userId),
      expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json(
      {
        id: result.adminId,
        email: result.email,
        name: result.name,
        displayName: result.displayName,
        role: body.role,
        tempPassword: result.tempPassword,
        seedPhrase: result.seedPhrase,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add admin";
    const status = message.includes("already exists") ? 400 : 500;
    if (status === 500) console.error("[admin/admins] failed to create admin:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

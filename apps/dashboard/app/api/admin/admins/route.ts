// app/api/admin/admins/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest } from "@/lib/session";
import { Admin, type AdminRole, type AdminStatus } from "@/models/admin";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLES: AdminRole[] = ["support", "admin", "super_admin"];
const STATUSES: AdminStatus[] = ["active", "suspended", "inactive"];

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

// app/api/admin/audit-log/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest } from "@/lib/session";
import { AdminLog, AdminLogSeverity, ActionCategories, TargetTypes } from "@/models/admin-log";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SEVERITIES = Object.values(AdminLogSeverity);
const STATUSES = ["success", "failed", "partial"] as const;

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin && !admin.permissions?.canViewAuditLog) {
    return NextResponse.json({ error: "You do not have permission to view the audit log" }, { status: 403 });
  }

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;

    const categoryParam = params.get("category") ?? "all";
    const category      = (ActionCategories as readonly string[]).includes(categoryParam) ? categoryParam : "all";
    const severityParam = params.get("severity") ?? "all";
    const severity      = (SEVERITIES as string[]).includes(severityParam) ? severityParam : "all";
    const statusParam   = params.get("status") ?? "all";
    const status        = (STATUSES as readonly string[]).includes(statusParam) ? statusParam : "all";
    const targetTypeParam = params.get("targetType") ?? "all";
    const targetType    = (TargetTypes as readonly string[]).includes(targetTypeParam) ? targetTypeParam : "all";
    const search        = params.get("search")?.trim();
    const dateFrom      = params.get("dateFrom");
    const dateTo        = params.get("dateTo");
    const page          = Math.max(1, Number(params.get("page")) || 1);
    const limit         = Math.min(100, Math.max(1, Number(params.get("limit")) || 25));

    const match: Record<string, unknown> = {};
    if (category !== "all") match.actionCategory = category;
    if (severity !== "all") match.severity = severity;
    if (status !== "all") match.status = status;
    if (targetType !== "all") match.targetType = targetType;
    if (dateFrom || dateTo) {
      match.createdAt = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { $lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      match.$or = [
        { details: { $regex: escapeRegExp(search), $options: "i" } },
        { targetName: { $regex: escapeRegExp(search), $options: "i" } },
        { adminName: { $regex: escapeRegExp(search), $options: "i" } },
        { adminEmail: { $regex: escapeRegExp(search), $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AdminLog.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminLog.countDocuments(match),
    ]);

    return NextResponse.json({
      filters: { category, severity, status, targetType, search, dateFrom, dateTo },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      logs: logs.map((l) => ({
        id: String(l._id),
        adminName: l.adminName,
        adminEmail: l.adminEmail,
        adminRole: l.adminRole,
        action: l.action,
        actionCategory: l.actionCategory,
        severity: l.severity,
        details: l.details,
        targetType: l.targetType ?? null,
        targetId: l.targetId ? String(l.targetId) : null,
        targetName: l.targetName ?? null,
        ipAddress: l.ipAddress,
        endpoint: l.endpoint ?? null,
        method: l.method ?? null,
        reason: l.reason ?? null,
        status: l.status,
        errorMessage: l.errorMessage ?? null,
        reversible: l.reversible,
        revertedAt: l.revertedAt ?? null,
        affectedCount: l.affectedCount ?? null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/audit-log] failed to list audit log:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}

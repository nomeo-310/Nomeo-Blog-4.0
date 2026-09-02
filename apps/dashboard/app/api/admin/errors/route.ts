// app/api/admin/errors/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest } from "@/lib/session";
import { ErrorLog, type ErrorSeverity, type ErrorSource } from "@/models/error-log";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SOURCES: ErrorSource[] = ["frontend", "backend", "background_job", "webhook"];
const SEVERITIES: ErrorSeverity[] = ["critical", "error", "warning", "info"];
const RESOLVED_STATES = ["all", "unresolved", "resolved"] as const;

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin && !admin.permissions?.canViewErrorLog) {
    return NextResponse.json({ error: "You do not have permission to view the error log" }, { status: 403 });
  }

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;

    const sourceParam   = params.get("source") ?? "all";
    const source        = (SOURCES as string[]).includes(sourceParam) ? sourceParam : "all";
    const severityParam = params.get("severity") ?? "all";
    const severity      = (SEVERITIES as string[]).includes(severityParam) ? severityParam : "all";
    const resolvedParam = params.get("resolved") ?? "unresolved";
    const resolved      = (RESOLVED_STATES as readonly string[]).includes(resolvedParam) ? resolvedParam : "unresolved";
    const search        = params.get("search")?.trim();
    const page           = Math.max(1, Number(params.get("page")) || 1);
    const limit          = Math.min(100, Math.max(1, Number(params.get("limit")) || 25));

    const match: Record<string, unknown> = {};
    if (source !== "all") match.source = source;
    if (severity !== "all") match.severity = severity;
    if (resolved !== "all") match.isResolved = resolved === "resolved";
    if (search) {
      match.$or = [
        { errorCode: { $regex: escapeRegExp(search), $options: "i" } },
        { message: { $regex: escapeRegExp(search), $options: "i" } },
        { url: { $regex: escapeRegExp(search), $options: "i" } },
      ];
    }

    const [logs, total, unresolvedCount] = await Promise.all([
      ErrorLog.find(match)
        .sort({ isResolved: 1, lastOccurredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ErrorLog.countDocuments(match),
      ErrorLog.countDocuments({ isResolved: false }),
    ]);

    return NextResponse.json({
      filters: { source, severity, resolved, search },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      unresolvedCount,
      logs: logs.map((l) => ({
        id: String(l._id),
        source: l.source,
        severity: l.severity,
        errorCode: l.errorCode,
        message: l.message,
        stack: l.stack ?? null,
        url: l.url ?? null,
        httpMethod: l.httpMethod ?? null,
        httpStatus: l.httpStatus ?? null,
        userId: l.userId ? String(l.userId) : null,
        userRole: l.userRole ?? null,
        clientContext: l.clientContext ?? null,
        serverContext: l.serverContext ?? null,
        isResolved: l.isResolved,
        resolvedAt: l.resolvedAt ?? null,
        resolutionNote: l.resolutionNote ?? null,
        occurrenceCount: l.occurrenceCount,
        lastOccurredAt: l.lastOccurredAt,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/errors] failed to list error log:", error);
    return NextResponse.json({ error: "Failed to load error log" }, { status: 500 });
  }
}

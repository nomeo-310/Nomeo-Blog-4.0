// app/api/admin/errors/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { ErrorLog }                    from "@/models/error-log";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BULK = 200;

/** Mirrors PATCH /api/admin/errors/[errorId] applied over a set, logged as one AdminLog entry. */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `errors-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin && !admin.permissions?.canViewErrorLog) {
    return NextResponse.json({ error: "You do not have permission to manage the error log" }, { status: 403 });
  }

  let body: { ids?: string[]; action?: "resolve" | "reopen"; resolutionNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} entries at once` }, { status: 400 });

  if (!body.action || !["resolve", "reopen"].includes(body.action)) {
    return NextResponse.json({ error: "action must be one of resolve, reopen" }, { status: 400 });
  }

  try {
    await connectDB();

    const entries = await ErrorLog.find({ _id: { $in: ids } });
    if (entries.length === 0) return NextResponse.json({ error: "None of the selected entries were found" }, { status: 404 });

    const now = new Date();
    const resolutionNote = body.resolutionNote?.trim() || undefined;

    for (const entry of entries) {
      if (body.action === "resolve") {
        entry.isResolved = true;
        entry.resolvedBy = new mongoose.Types.ObjectId(admin.id);
        entry.resolvedAt = now;
        entry.resolutionNote = resolutionNote;
      } else {
        entry.isResolved = false;
        entry.resolvedBy = undefined;
        entry.resolvedAt = undefined;
        entry.resolutionNote = undefined;
      }
    }

    await Promise.all(entries.map((e) => e.save()));

    // Best-effort — same rationale as the single-item route: the update
    // above already committed, a logging hiccup shouldn't report failure.
    try {
      await logAdminAction(req, admin, {
        action: body.action === "resolve" ? AdminAction.RESOLVE_ERROR : AdminAction.REOPEN_ERROR,
        details: `bulk ${body.action === "resolve" ? "resolved" : "reopened"} ${entries.length} error(s)`,
        targetType: "system",
        reversible: true,
        affectedCount: entries.length,
      });
    } catch (logErr) {
      console.error("[admin/errors/bulk] failed to write audit log entry:", logErr);
    }

    return NextResponse.json({ requested: ids.length, updated: entries.length });
  } catch (error) {
    console.error("[admin/errors/bulk] failed to process bulk action:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}

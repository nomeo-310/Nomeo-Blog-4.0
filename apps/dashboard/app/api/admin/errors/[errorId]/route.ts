// app/api/admin/errors/[errorId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { ErrorLog }                    from "@/models/error-log";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ errorId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin && !admin.permissions?.canViewErrorLog) {
    return NextResponse.json({ error: "You do not have permission to manage the error log" }, { status: 403 });
  }

  const { errorId } = await params;
  if (!mongoose.Types.ObjectId.isValid(errorId)) {
    return NextResponse.json({ error: "Invalid error id" }, { status: 400 });
  }

  let body: { action?: "resolve" | "reopen"; resolutionNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !["resolve", "reopen"].includes(body.action)) {
    return NextResponse.json({ error: "action must be one of resolve, reopen" }, { status: 400 });
  }

  try {
    await connectDB();

    const entry = await ErrorLog.findById(errorId);
    if (!entry) return NextResponse.json({ error: "Error log entry not found" }, { status: 404 });

    if (body.action === "resolve") {
      entry.isResolved = true;
      entry.resolvedBy = new mongoose.Types.ObjectId(admin.id);
      entry.resolvedAt = new Date();
      entry.resolutionNote = body.resolutionNote?.trim() || undefined;
    } else {
      entry.isResolved = false;
      entry.resolvedBy = undefined;
      entry.resolvedAt = undefined;
      entry.resolutionNote = undefined;
    }

    await entry.save();

    // Best-effort: the resolve/reopen above is the action the admin asked
    // for and has already committed — a failure writing the audit trail
    // (e.g. a transient DB hiccup) shouldn't make the response report the
    // whole request as failed when it actually succeeded.
    try {
      await logAdminAction(req, admin, {
        action: body.action === "resolve" ? AdminAction.RESOLVE_ERROR : AdminAction.REOPEN_ERROR,
        details: `${body.action === "resolve" ? "resolved" : "reopened"} error ${entry.errorCode} (${entry.source})`,
        targetType: "system",
        targetId: String(entry._id),
        targetName: entry.errorCode,
        reversible: true,
      });
    } catch (logErr) {
      console.error("[admin/errors/:errorId] failed to write audit log entry:", logErr);
    }

    return NextResponse.json({
      id: String(entry._id),
      isResolved: entry.isResolved,
      resolvedAt: entry.resolvedAt ?? null,
      resolutionNote: entry.resolutionNote ?? null,
    });
  } catch (error) {
    console.error("[admin/errors/:errorId] failed to update error log entry:", error);
    return NextResponse.json({ error: "Failed to update error log entry" }, { status: 500 });
  }
}

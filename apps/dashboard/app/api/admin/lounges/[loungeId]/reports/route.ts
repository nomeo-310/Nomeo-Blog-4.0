// app/api/admin/lounges/[loungeId]/reports/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction, AdminLogSeverity } from "@/models/admin-log";
import { LoungeMessage, type ILoungeMessageReport } from "@/models/lounge";

export const dynamic = "force-dynamic";

type ReportAction = "review" | "dismiss" | "escalate";

const ACTION_LOG: Record<ReportAction, { action: AdminAction; severity?: AdminLogSeverity }> = {
  review:   { action: AdminAction.REVIEW_REPORT },
  dismiss:  { action: AdminAction.DISMISS_REPORT },
  escalate: { action: AdminAction.ESCALATE_REPORT, severity: AdminLogSeverity.CRITICAL },
};

interface ReportRow {
  messageId: mongoose.Types.ObjectId;
  messageBody: string;
  reportId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  reportedBy: mongoose.Types.ObjectId;
  reportedAt: Date;
  reviewed: boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const rows = (await db
      .collection("lounge_messages")
      .aggregate([
        { $match: { loungeId: new mongoose.Types.ObjectId(loungeId), "reports.0": { $exists: true } } },
        { $unwind: "$reports" },
        {
          $project: {
            _id: 0,
            messageId:   "$_id",
            messageBody: "$body",
            reportId:    "$reports._id",
            reason:      "$reports.reason",
            details:     "$reports.details",
            reportedBy:  "$reports.reportedBy",
            reportedAt:  "$reports.reportedAt",
            reviewed:    "$reports.reviewed",
            reviewedBy:  "$reports.reviewedBy",
            reviewedAt:  "$reports.reviewedAt",
          },
        },
        { $sort: { reviewed: 1, reportedAt: -1 } },
      ])
      .toArray()) as ReportRow[];

    const peopleIds = [
      ...rows.map((r) => r.reportedBy),
      ...rows.filter((r) => r.reviewedBy).map((r) => r.reviewedBy!),
    ];
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      loungeId,
      reports: rows.map((r) => ({
        messageId: String(r.messageId),
        messageBody: r.messageBody,
        reportId: String(r.reportId),
        reason: r.reason, details: r.details,
        reportedBy: { id: String(r.reportedBy), ...personOrUnknown(r.reportedBy) },
        reportedAt: r.reportedAt, reviewed: r.reviewed,
        reviewedBy: r.reviewedBy ? { id: String(r.reviewedBy), ...personOrUnknown(r.reviewedBy) } : null,
        reviewedAt: r.reviewedAt,
      })),
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/reports] failed to load reports:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  let body: { messageId?: string; reportId?: string; action?: ReportAction; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messageId, reportId, action, note } = body;
  if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "A valid messageId is required" }, { status: 400 });
  }
  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: "A valid reportId is required" }, { status: 400 });
  }
  if (!action || !ACTION_LOG[action]) {
    return NextResponse.json({ error: "action must be one of review, dismiss, escalate" }, { status: 400 });
  }

  try {
    await connectDB();

    const message = await LoungeMessage.findOne({ _id: messageId, loungeId });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const report = message.reports.id(reportId);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    report.reviewed = true;
    report.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    report.reviewedAt = new Date();

    message.pendingReportsCount = message.reports.filter((r: ILoungeMessageReport) => !r.reviewed).length;
    await message.save();

    const { action: adminAction, severity } = ACTION_LOG[action];
    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} report on a lounge message`,
      targetType: "lounge_message",
      targetId: String(message._id),
      reason: note,
      severity,
    });

    return NextResponse.json({
      messageId,
      reportId,
      reviewed: true,
      pendingReportsCount: message.pendingReportsCount,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/reports] failed to action report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

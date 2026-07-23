// app/api/admin/posts/[postId]/reports/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction, AdminLogSeverity } from "@/models/admin-log";
import { Post, type IPostReport }      from "@/models/post";

export const dynamic = "force-dynamic";

type ReportAction = "review" | "dismiss" | "escalate";

const ACTION_LOG: Record<ReportAction, { action: AdminAction; severity?: AdminLogSeverity }> = {
  review:   { action: AdminAction.REVIEW_REPORT },
  dismiss:  { action: AdminAction.DISMISS_REPORT },
  escalate: { action: AdminAction.ESCALATE_REPORT, severity: AdminLogSeverity.CRITICAL },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const post = await Post.findById(postId, { reports: 1, title: 1 }).lean();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const reports = post.reports as (IPostReport & { _id: mongoose.Types.ObjectId })[];
    const peopleIds = [
      ...reports.map((r) => r.reportedBy),
      ...reports.filter((r) => r.reviewedBy).map((r) => r.reviewedBy!),
    ];
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      postId: String(post._id),
      postTitle: post.title,
      reports: reports
        .map((r) => ({
          id: String(r._id), reason: r.reason, details: r.details,
          reportedBy: { id: String(r.reportedBy), ...personOrUnknown(r.reportedBy) },
          reportedAt: r.reportedAt, reviewed: r.reviewed,
          reviewedBy: r.reviewedBy ? { id: String(r.reviewedBy), ...personOrUnknown(r.reviewedBy) } : null,
          reviewedAt: r.reviewedAt,
        }))
        .sort((a, b) => (a.reviewed === b.reviewed ? 0 : a.reviewed ? 1 : -1)),
    });
  } catch (error) {
    console.error("[admin/posts/:postId/reports] failed to load reports:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  let body: { reportId?: string; action?: ReportAction; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reportId, action, note } = body;
  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: "A valid reportId is required" }, { status: 400 });
  }
  if (!action || !ACTION_LOG[action]) {
    return NextResponse.json({ error: "action must be one of review, dismiss, escalate" }, { status: 400 });
  }

  try {
    await connectDB();

    const post = await Post.findById(postId);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const report = post.reports.id(reportId);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    report.reviewed = true;
    report.reviewedBy = new mongoose.Types.ObjectId(admin.id);
    report.reviewedAt = new Date();

    post.pendingReportsCount = post.reports.filter((r: IPostReport) => !r.reviewed).length;
    await post.save();

    const { action: adminAction, severity } = ACTION_LOG[action];
    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} report on post "${post.title}"`,
      targetType: "post",
      targetId: String(post._id),
      targetName: post.title,
      reason: note,
      severity,
    });

    return NextResponse.json({
      reportId,
      reviewed: true,
      pendingReportsCount: post.pendingReportsCount,
    });
  } catch (error) {
    console.error("[admin/posts/:postId/reports] failed to action report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

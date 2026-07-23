// app/api/admin/adverts/[advertId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest }  from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { Advert, type AdvertAudience, type AdvertPlacement, type DismissBehavior } from "@/models/advert";
import { AdvertImpression }            from "@/models/advert-impression";

export const dynamic = "force-dynamic";

type LifecycleAction = "approve" | "reject" | "pause" | "resume" | "complete" | "update";

const LIFECYCLE_ACTIONS: LifecycleAction[] = ["approve", "reject", "pause", "resume", "complete", "update"];
const PLACEMENTS: AdvertPlacement[] = ["hero", "feed_card", "in_article", "notification_banner", "modal_popup"];

function computeLiveStatus(startAt?: Date): "scheduled" | "active" {
  return startAt && startAt > new Date() ? "scheduled" : "active";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ advertId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { advertId } = await params;
  if (!mongoose.Types.ObjectId.isValid(advertId)) {
    return NextResponse.json({ error: "Invalid advert id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const advert = await Advert.findById(advertId).lean();
    if (!advert) return NextResponse.json({ error: "Advert not found" }, { status: 404 });

    const peopleIds = [
      advert.createdBy,
      ...(advert.reviewedBy ? [advert.reviewedBy] : []),
      ...(advert.creatorId ? [advert.creatorId] : []),
    ];

    const [people, post, impressionStatsRows, recentActions] = await Promise.all([
      db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray(),
      advert.postId
        ? db.collection("posts").findOne({ _id: advert.postId }, { projection: { title: 1, slug: 1 } })
        : null,
      db.collection("advert_impressions").aggregate([
        { $match: { advertId: new mongoose.Types.ObjectId(advertId) } },
        {
          $group: {
            _id: null,
            uniqueViewers:    { $sum: 1 },
            totalImpressions: { $sum: "$impressions" },
            clickedCount:     { $sum: { $cond: ["$clicked", 1, 0] } },
            dismissedCount:   { $sum: { $cond: ["$dismissed", 1, 0] } },
          },
        },
      ]).toArray(),
      AdminLog.getActionsByTarget("advert", advertId),
    ]);

    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    const impressionStats = impressionStatsRows[0] ?? { uniqueViewers: 0, totalImpressions: 0, clickedCount: 0, dismissedCount: 0 };

    return NextResponse.json({
      advert: {
        id: String(advert._id),
        type: advert.type, placement: advert.placement, status: advert.status,
        title: advert.title, body: advert.body, image: advert.image,
        ctaLabel: advert.ctaLabel, ctaUrl: advert.ctaUrl,
        createdBy: { id: String(advert.createdBy), ...personOrUnknown(advert.createdBy) },
        requiresReview: advert.requiresReview,
        submittedAt: advert.submittedAt,
        reviewedBy: advert.reviewedBy ? { id: String(advert.reviewedBy), ...personOrUnknown(advert.reviewedBy) } : null,
        reviewedAt: advert.reviewedAt,
        reviewNote: advert.reviewNote,
        advertiserName: advert.advertiserName, advertiserContact: advert.advertiserContact,
        creator: advert.creatorId ? { id: String(advert.creatorId), ...personOrUnknown(advert.creatorId) } : null,
        post: post ? { id: String(post._id), title: post.title as string, slug: post.slug as string } : null,
        targeting: advert.targeting,
        startAt: advert.startAt, endAt: advert.endAt,
        priority: advert.priority, weight: advert.weight,
        maxImpressionsPerUser: advert.maxImpressionsPerUser,
        dismissBehavior: advert.dismissBehavior, popupDelaySeconds: advert.popupDelaySeconds,
        billable: advert.billable, billing: advert.billing,
        metrics: advert.metrics,
        ctr: advert.metrics.impressions > 0 ? Math.round((advert.metrics.clicks / advert.metrics.impressions) * 1000) / 1000 : 0,
        createdAt: advert.createdAt, updatedAt: advert.updatedAt,
      },
      impressionStats: {
        uniqueViewers: impressionStats.uniqueViewers,
        totalImpressions: impressionStats.totalImpressions,
        clickedCount: impressionStats.clickedCount,
        dismissedCount: impressionStats.dismissedCount,
        clickThroughRate: impressionStats.uniqueViewers > 0
          ? Math.round((impressionStats.clickedCount / impressionStats.uniqueViewers) * 1000) / 1000
          : 0,
      },
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/adverts/:advertId] failed to load advert:", error);
    return NextResponse.json({ error: "Failed to load advert" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ advertId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { advertId } = await params;
  if (!mongoose.Types.ObjectId.isValid(advertId)) {
    return NextResponse.json({ error: "Invalid advert id" }, { status: 400 });
  }

  let body: {
    action?: LifecycleAction;
    reviewNote?: string;
    reason?: string;
    fields?: {
      title?: string; body?: string; ctaLabel?: string; ctaUrl?: string;
      image?: { url: string; publicId: string; width?: number; height?: number } | null;
      placement?: AdvertPlacement;
      targeting?: { topics?: string[]; audience?: AdvertAudience; locations?: string[] };
      startAt?: string; endAt?: string;
      priority?: number; weight?: number; maxImpressionsPerUser?: number;
      dismissBehavior?: DismissBehavior; popupDelaySeconds?: number;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;
  if (!action || !LIFECYCLE_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "action must be one of approve, reject, pause, resume, complete, update" }, { status: 400 });
  }
  if (action === "reject" && !body.reviewNote?.trim()) {
    return NextResponse.json({ error: "reviewNote is required to reject an advert" }, { status: 400 });
  }

  try {
    await connectDB();

    const advert = await Advert.findById(advertId);
    if (!advert) return NextResponse.json({ error: "Advert not found" }, { status: 404 });

    let adminAction: AdminAction;
    const now = new Date();

    switch (action) {
      case "approve":
        if (advert.status !== "pending_review") {
          return NextResponse.json({ error: "Only adverts pending review can be approved" }, { status: 409 });
        }
        advert.reviewedBy = new mongoose.Types.ObjectId(admin.id);
        advert.reviewedAt = now;
        advert.reviewNote = body.reviewNote?.trim();
        advert.status = computeLiveStatus(advert.startAt);
        adminAction = AdminAction.APPROVE_ADVERT;
        break;

      case "reject":
        if (advert.status !== "pending_review") {
          return NextResponse.json({ error: "Only adverts pending review can be rejected" }, { status: 409 });
        }
        advert.reviewedBy = new mongoose.Types.ObjectId(admin.id);
        advert.reviewedAt = now;
        advert.reviewNote = body.reviewNote!.trim();
        advert.status = "rejected";
        adminAction = AdminAction.REJECT_ADVERT;
        break;

      case "pause":
        if (advert.status !== "active" && advert.status !== "scheduled") {
          return NextResponse.json({ error: "Only active or scheduled adverts can be paused" }, { status: 409 });
        }
        advert.status = "paused";
        adminAction = AdminAction.PAUSE_ADVERT;
        break;

      case "resume":
        if (advert.status !== "paused") {
          return NextResponse.json({ error: "Only paused adverts can be resumed" }, { status: 409 });
        }
        advert.status = computeLiveStatus(advert.startAt);
        adminAction = AdminAction.RESUME_ADVERT;
        break;

      case "complete":
        if (advert.status === "completed") {
          return NextResponse.json({ error: "Advert is already completed" }, { status: 409 });
        }
        advert.status = "completed";
        adminAction = AdminAction.COMPLETE_ADVERT;
        break;

      case "update": {
        const f = body.fields ?? {};

        if (f.placement !== undefined) {
          if (!PLACEMENTS.includes(f.placement)) {
            return NextResponse.json({ error: `placement must be one of ${PLACEMENTS.join(", ")}` }, { status: 400 });
          }
          // Hero is the homepage carousel — it exists to feature an attached blog post, never
          // generic house/sponsored creative. Both promoted_post and creator_promo carry a
          // postId, so eligibility is keyed on that rather than the advert's `type` literally.
          if (f.placement === "hero" && !advert.postId) {
            return NextResponse.json({ error: "The hero placement requires a post attached to the advert" }, { status: 400 });
          }
          advert.placement = f.placement;
        }

        if (f.title !== undefined) advert.title = f.title.trim();
        if (f.body !== undefined) advert.body = f.body.trim();
        if (f.ctaLabel !== undefined) advert.ctaLabel = f.ctaLabel.trim();
        if (f.ctaUrl !== undefined) advert.ctaUrl = f.ctaUrl.trim();
        if (f.image !== undefined) advert.image = f.image;
        if (f.targeting !== undefined) {
          advert.targeting = {
            topics: f.targeting.topics ?? advert.targeting.topics,
            audience: f.targeting.audience ?? advert.targeting.audience,
            locations: f.targeting.locations ?? advert.targeting.locations,
          };
        }
        if (f.startAt !== undefined) advert.startAt = f.startAt ? new Date(f.startAt) : undefined;
        if (f.endAt !== undefined) advert.endAt = f.endAt ? new Date(f.endAt) : undefined;
        if (f.priority !== undefined) advert.priority = f.priority;
        if (f.weight !== undefined) advert.weight = f.weight;
        if (f.maxImpressionsPerUser !== undefined) advert.maxImpressionsPerUser = f.maxImpressionsPerUser;
        if (f.dismissBehavior !== undefined) advert.dismissBehavior = f.dismissBehavior;
        if (f.popupDelaySeconds !== undefined) advert.popupDelaySeconds = f.popupDelaySeconds;
        // Re-derive scheduled vs active if the schedule moved and the advert is already live.
        if ((f.startAt !== undefined) && (advert.status === "scheduled" || advert.status === "active")) {
          advert.status = computeLiveStatus(advert.startAt);
        }
        adminAction = AdminAction.UPDATE_ADVERT;
        break;
      }
    }

    await advert.save();

    await logAdminAction(req, admin, {
      action: adminAction,
      details: `${action} advert "${advert.title}"`,
      targetType: "advert",
      targetId: String(advert._id),
      targetName: advert.title,
      reason: body.reason ?? body.reviewNote,
      reversible: action !== "reject",
    });

    return NextResponse.json({ id: String(advert._id), status: advert.status });
  } catch (error) {
    console.error("[admin/adverts/:advertId] failed to update advert:", error);
    return NextResponse.json({ error: "Failed to update advert" }, { status: 500 });
  }
}

/** Permanently deletes an advert — super_admin only, irreversible. No permission flag is modeled for adverts, so this mirrors the posts hard-delete default. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ advertId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can permanently delete an advert" }, { status: 403 });
  }

  const { advertId } = await params;
  if (!mongoose.Types.ObjectId.isValid(advertId)) {
    return NextResponse.json({ error: "Invalid advert id" }, { status: 400 });
  }

  let body: { reason?: string; confirmTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason, confirmTitle } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to permanently delete an advert" }, { status: 400 });
  }

  try {
    await connectDB();

    const advert = await Advert.findById(advertId);
    if (!advert) return NextResponse.json({ error: "Advert not found" }, { status: 404 });
    if (confirmTitle !== advert.title) {
      return NextResponse.json({ error: "confirmTitle must match the advert's title to confirm permanent deletion" }, { status: 400 });
    }

    await AdvertImpression.deleteMany({ advertId: advert._id });
    await advert.deleteOne();

    await logAdminAction(req, admin, {
      action: AdminAction.DELETE_ADVERT,
      details: `permanently deleted advert "${advert.title}"`,
      targetType: "advert",
      targetId: advertId,
      targetName: advert.title,
      reason,
      reversible: false,
    });

    return NextResponse.json({ id: advertId, deleted: true });
  } catch (error) {
    console.error("[admin/adverts/:advertId] failed to delete advert:", error);
    return NextResponse.json({ error: "Failed to delete advert" }, { status: 500 });
  }
}

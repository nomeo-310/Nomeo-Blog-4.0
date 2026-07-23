// app/api/admin/adverts/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Advert, type AdvertAudience, type AdvertPlacement, type DismissBehavior } from "@/models/advert";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:           { createdAt: -1 },
  oldest:           { createdAt: 1 },
  most_impressions: { "metrics.impressions": -1 },
  most_clicks:      { "metrics.clicks": -1 },
  priority:         { priority: -1, weight: -1 },
};

const PLACEMENTS: AdvertPlacement[] = ["hero", "feed_card", "in_article", "notification_banner", "modal_popup"];
/**
 * Types an admin can create directly — creator_promo is creator-initiated
 * elsewhere. "promoted_post" is included here specifically so admins can
 * curate the homepage hero carousel (an internal blog post banner), not just
 * boost a post into the feed.
 */
const ADMIN_CREATABLE_TYPES = ["house", "sponsored", "promoted_post"] as const;

interface AdvertListRow {
  _id: mongoose.Types.ObjectId;
  type: string;
  placement: string;
  status: string;
  title: string;
  createdBy: mongoose.Types.ObjectId;
  creatorId?: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  billable: boolean;
  billing?: { status: string } | null;
  targeting: { audience: string };
  priority: number;
  weight: number;
  metrics: { impressions: number; clicks: number; uniqueImpressions: number };
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const type          = params.get("type") ?? "all";
    const status         = params.get("status") ?? "all";
    const placement       = params.get("placement") ?? "all";
    const billableParam   = params.get("billable");
    const createdByParam  = params.get("createdBy");
    const search           = params.get("search")?.trim();
    const sortByParam      = params.get("sortBy") ?? "newest";
    const sortBy            = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page               = Math.max(1, Number(params.get("page")) || 1);
    const limit               = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (type !== "all") match.type = type;
    if (status !== "all") match.status = status;
    if (PLACEMENTS.includes(placement as AdvertPlacement)) match.placement = placement;
    if (billableParam === "true") match.billable = true;
    if (billableParam === "false") match.billable = false;
    if (search) match.title = { $regex: escapeRegExp(search), $options: "i" };
    if (createdByParam && mongoose.Types.ObjectId.isValid(createdByParam)) {
      match.createdBy = new mongoose.Types.ObjectId(createdByParam);
    }

    const [facetResult] = await db
      .collection("adverts")
      .aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  type: 1, placement: 1, status: 1, title: 1, createdBy: 1,
                  creatorId: 1, postId: 1, billable: 1, "billing.status": 1,
                  "targeting.audience": 1, priority: 1, weight: 1, metrics: 1,
                  startAt: 1, endAt: 1, createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as AdvertListRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const peopleIds = [...new Set(rows.map((r) => String(r.createdBy)))].map((id) => new mongoose.Types.ObjectId(id));
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));

    const adverts = rows.map((r) => ({
      id:        String(r._id),
      type:      r.type,
      placement: r.placement,
      status:    r.status,
      title:     r.title,
      createdBy: { id: String(r.createdBy), ...(personById.get(String(r.createdBy)) ?? { name: "Unknown", email: "" }) },
      creatorId: r.creatorId ? String(r.creatorId) : null,
      postId:    r.postId ? String(r.postId) : null,
      billable:  r.billable,
      billingStatus: r.billing?.status ?? null,
      audience:  r.targeting?.audience ?? "all",
      priority:  r.priority,
      weight:    r.weight,
      metrics:   r.metrics,
      ctr: r.metrics.impressions > 0 ? Math.round((r.metrics.clicks / r.metrics.impressions) * 1000) / 1000 : 0,
      startAt: r.startAt,
      endAt:   r.endAt,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { type, status, placement, billable: billableParam, createdBy: createdByParam, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      adverts,
    });
  } catch (error) {
    console.error("[admin/adverts] failed to list adverts:", error);
    return NextResponse.json({ error: "Failed to load adverts" }, { status: 500 });
  }
}

/**
 * Creates an admin-authored advert — "house" (Nomeo's own promos) or "sponsored"
 * (an admin setting one up on a brand's behalf). "promoted_post" and
 * "creator_promo" are creator-initiated elsewhere and aren't created here.
 *
 * Per the documented lifecycle, admin-created adverts skip the review queue
 * entirely (requiresReview: false) and go straight to "scheduled" or "active"
 * depending on startAt — the admin creating it IS the approval.
 */
export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    type?: string;
    placement?: AdvertPlacement;
    postId?: string;
    title?: string;
    body?: string;
    image?: { url: string; publicId: string; width?: number; height?: number } | null;
    ctaLabel?: string;
    ctaUrl?: string;
    advertiserName?: string;
    advertiserContact?: string;
    targeting?: { topics?: string[]; audience?: AdvertAudience; locations?: string[] };
    startAt?: string;
    endAt?: string;
    priority?: number;
    weight?: number;
    maxImpressionsPerUser?: number;
    dismissBehavior?: DismissBehavior;
    popupDelaySeconds?: number;
    billing?: { amount: number; currency?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type;
  if (!type || !ADMIN_CREATABLE_TYPES.includes(type as (typeof ADMIN_CREATABLE_TYPES)[number])) {
    return NextResponse.json({ error: "type must be 'house', 'sponsored', or 'promoted_post'" }, { status: 400 });
  }
  if (!body.placement || !PLACEMENTS.includes(body.placement)) {
    return NextResponse.json({ error: `placement must be one of ${PLACEMENTS.join(", ")}` }, { status: 400 });
  }
  if (type === "promoted_post" && (!body.postId || !mongoose.Types.ObjectId.isValid(body.postId))) {
    return NextResponse.json({ error: "A valid postId is required for a promoted_post advert" }, { status: 400 });
  }
  // Hero is the homepage carousel — it exists to feature an attached blog post, never generic
  // house/sponsored creative. (This admin form only creates promoted_post as a post-attached
  // type; creator_promo adverts can also use hero, but those aren't created here.)
  if (body.placement === "hero" && !body.postId) {
    return NextResponse.json({ error: "The hero placement requires a post attached to the advert" }, { status: 400 });
  }
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
  if (title.length > 150) return NextResponse.json({ error: "Title must be 150 characters or fewer" }, { status: 400 });

  const startAt = body.startAt ? new Date(body.startAt) : undefined;
  const endAt   = body.endAt ? new Date(body.endAt) : undefined;
  if (startAt && endAt && endAt <= startAt) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    let image = body.image ?? null;
    if (type === "promoted_post") {
      const post = await db.collection("posts").findOne(
        { _id: new mongoose.Types.ObjectId(body.postId) },
        { projection: { coverImage: 1 } }
      );
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      // Default the hero banner image to the post's own cover image when one isn't supplied.
      if (!image && post.coverImage?.secureUrl) {
        image = { url: post.coverImage.secureUrl, publicId: post.coverImage.publicId };
      }
    }

    // Editorial curation (admin picking a post for the hero/feed) isn't paid by default —
    // only mark it billable if the admin explicitly attaches billing info.
    const billable = type === "sponsored" ? true : type === "promoted_post" ? !!body.billing : false;
    const status = startAt && startAt > new Date() ? "scheduled" : "active";

    const advert = await Advert.create({
      type,
      placement: body.placement,
      status,
      title,
      body: body.body?.trim() || undefined,
      image,
      ctaLabel: body.ctaLabel?.trim() || undefined,
      ctaUrl: body.ctaUrl?.trim() || undefined,
      createdBy: new mongoose.Types.ObjectId(admin.id),
      requiresReview: false,
      submittedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(admin.id),
      reviewedAt: new Date(),
      advertiserName: body.advertiserName?.trim() || undefined,
      advertiserContact: body.advertiserContact?.trim() || undefined,
      postId: type === "promoted_post" ? new mongoose.Types.ObjectId(body.postId) : undefined,
      targeting: {
        topics: body.targeting?.topics ?? [],
        audience: body.targeting?.audience ?? (type === "sponsored" ? "free_only" : "all"),
        locations: body.targeting?.locations ?? [],
      },
      startAt,
      endAt,
      priority: body.priority ?? 0,
      weight: body.weight ?? 1,
      maxImpressionsPerUser: body.maxImpressionsPerUser ?? 0,
      dismissBehavior: body.dismissBehavior ?? "session",
      popupDelaySeconds: body.popupDelaySeconds ?? 0,
      billable,
      billing: billable && body.billing
        ? { amount: body.billing.amount, currency: body.billing.currency ?? "NGN", status: "pending" }
        : null,
    });

    await logAdminAction(req, admin, {
      action: AdminAction.CREATE_ADVERT,
      details: `created ${type} advert "${advert.title}"`,
      targetType: "advert",
      targetId: String(advert._id),
      targetName: advert.title,
      reversible: true,
    });

    return NextResponse.json(
      { id: String(advert._id), title: advert.title, type: advert.type, status: advert.status },
      { status: 201 }
    );
  } catch (error) {
    console.error("[admin/adverts] failed to create advert:", error);
    return NextResponse.json({ error: "Failed to create advert" }, { status: 500 });
  }
}

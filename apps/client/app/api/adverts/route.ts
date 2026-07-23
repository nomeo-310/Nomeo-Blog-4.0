import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { Advert, type AdvertPlacement, type AdvertType } from "@/models/advert";
import { serializeAdvertFull } from "@/services/advert-services";

export const dynamic = "force-dynamic";

const PLACEMENTS: AdvertPlacement[] = ["hero", "feed_card", "in_article", "notification_banner", "modal_popup"];
const TYPES: AdvertType[] = ["sponsored", "house", "promoted_post", "creator_promo"];
const DISMISS_BEHAVIORS = ["once", "session", "always"];
const STAFF_ROLES = ["admin", "super_admin"];

/**
 * GET /api/adverts?status=&scope=&page=&limit=
 * -----------------------------------------------
 * Lists adverts for the "my promotions" dashboard. Regular users/creators
 * only ever see their own (createdBy = self); staff can pass scope=all to
 * see everything, e.g. for a moderation queue.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const isStaff = STAFF_ROLES.includes(user.role);
    const wantsAll = isStaff && searchParams.get("scope") === "all";

    const filter: Record<string, unknown> = wantsAll ? {} : { createdBy: user.id };
    if (status) filter.status = status;

    const page  = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const [adverts, total] = await Promise.all([
      Advert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Advert.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      adverts: adverts.map(serializeAdvertFull),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("[GET /api/adverts]", err);
    return NextResponse.json({ success: false, message: "Failed to load adverts" }, { status: 500 });
  }
}

/**
 * POST /api/adverts
 * -------------------
 * Creates an advert. Who can create what:
 *   - sponsored / house → staff only (house skips review; sponsored still
 *     requires it, since it's billable and needs an admin to confirm billing).
 *   - creator_promo / promoted_post → creators (promoting their own work) or
 *     staff on a creator's behalf. Always requires review.
 *   - placement "hero" → staff only, regardless of advert type — the home
 *     hero carousel is never creator-selectable.
 * New adverts start in "draft"; the owner submits for review via
 * PATCH { status: "pending_review" } once they're happy with it.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const isStaff = STAFF_ROLES.includes(user.role);
    const body = await req.json();

    const {
      type, placement, title, body: adBody, image, ctaLabel, ctaUrl,
      targeting, startAt, endAt, priority, weight, maxImpressionsPerUser,
      dismissBehavior, popupDelaySeconds, advertiserName, advertiserContact, postId,
    } = body ?? {};

    if (!title?.trim()) {
      return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
    }
    if (!placement || !PLACEMENTS.includes(placement)) {
      return NextResponse.json({ success: false, message: "Invalid placement" }, { status: 400 });
    }
    if (placement === "hero" && !isStaff) {
      return NextResponse.json({ success: false, message: "Only admins can create a hero placement" }, { status: 403 });
    }
    if (placement === "hero" && !postId) {
      return NextResponse.json({ success: false, message: "Hero is reserved for posts — link one with postId" }, { status: 400 });
    }
    if (!type || !TYPES.includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid advert type" }, { status: 400 });
    }
    if (["sponsored", "house"].includes(type) && !isStaff) {
      return NextResponse.json({ success: false, message: "Only admins can create this advert type" }, { status: 403 });
    }
    if (["creator_promo", "promoted_post"].includes(type) && user.role !== "creator" && !isStaff) {
      return NextResponse.json({ success: false, message: "Only creators can promote content" }, { status: 403 });
    }
    if (postId && !mongoose.isValidObjectId(postId)) {
      return NextResponse.json({ success: false, message: "Invalid post id" }, { status: 400 });
    }

    await connectDB();

    // House promos from staff can skip review and go straight to draft →
    // staff still flips status to scheduled/active explicitly via PATCH.
    const requiresReview = !(isStaff && type === "house");

    const advert = await Advert.create({
      type,
      placement,
      status: "draft",
      title: title.trim(),
      body: adBody?.trim(),
      image: image ?? null,
      ctaLabel: ctaLabel?.trim(),
      ctaUrl: ctaUrl?.trim(),
      createdBy: user.id,
      requiresReview,
      advertiserName: advertiserName?.trim(),
      advertiserContact: advertiserContact?.trim(),
      creatorId: type === "creator_promo" ? user.id : undefined,
      postId: postId || undefined,
      targeting: {
        topics: Array.isArray(targeting?.topics) ? targeting.topics : [],
        audience: ["all", "free_only", "subscribers_only"].includes(targeting?.audience)
          ? targeting.audience
          : type === "sponsored" ? "free_only" : "all",
        locations: Array.isArray(targeting?.locations) ? targeting.locations : [],
      },
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
      priority: isStaff && typeof priority === "number" ? priority : 0,
      weight: typeof weight === "number" && weight > 0 ? weight : 1,
      maxImpressionsPerUser: typeof maxImpressionsPerUser === "number" ? Math.max(0, maxImpressionsPerUser) : 0,
      dismissBehavior: DISMISS_BEHAVIORS.includes(dismissBehavior) ? dismissBehavior : "session",
      popupDelaySeconds: typeof popupDelaySeconds === "number" ? Math.max(0, popupDelaySeconds) : 0,
      billable: type !== "house",
    });

    return NextResponse.json({ success: true, advert: serializeAdvertFull(advert) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/adverts]", err);
    return NextResponse.json({ success: false, message: "Failed to create advert" }, { status: 500 });
  }
}

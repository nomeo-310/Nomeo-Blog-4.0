import mongoose from "mongoose";
import { Advert, type IAdvert, type AdvertPlacement } from "@/models/advert";
import { AdvertImpression } from "@/models/advert-impression";
import { Subscription } from "@/models/subscription";

/**
 * Advert delivery — Nomeo.
 * ------------------------
 * Single source of truth for "which advert (if any) should this viewer see
 * in this slot?" and for recording what happened once they saw it. Mirrors
 * the shape of post-access-services.ts: pure functions, no route-handler
 * concerns (cookies, auth) leak in here — callers pass a resolved viewer.
 *
 * Selection pipeline:
 *   1. Filter to live, in-window, audience-eligible candidates for the slot,
 *      ordered by priority desc then weight desc (same index the model
 *      documents at AdvertSchema.index({ placement, status, priority, weight })).
 *   2. Drop candidates the viewer has exhausted (maxImpressionsPerUser) or
 *      permanently dismissed (dismissBehavior "once").
 *   3. Weighted-random pick among the highest remaining priority tier, so
 *      same-priority adverts rotate instead of one always winning.
 */

const ACTIVE_SUB_STATUSES = ["active", "trialing"];
const CANDIDATE_LIMIT = 20;

export interface Viewer {
  userId?: string | null;
  visitorKey?: string | null;
}

async function isActiveSubscriber(userId: string): Promise<boolean> {
  const sub = await Subscription.findOne({
    subscriberId: new mongoose.Types.ObjectId(userId),
    status: { $in: ACTIVE_SUB_STATUSES },
    currentPeriodEnd: { $gte: new Date() },
  })
    .select("_id")
    .lean();
  return !!sub;
}

export interface SelectAdvertOptions {
  placement: AdvertPlacement;
  userId?: string | null;
  visitorKey?: string | null;
  /** Topic slugs of the surrounding context (post/feed), for targeting. */
  topics?: string[];
}

/**
 * Shared by both selectors: live, in-window, audience-eligible candidates
 * for the slot, with viewer-exhausted/permanently-dismissed ones dropped —
 * ordered by priority desc then weight desc.
 */
async function getEligibleCandidates(opts: SelectAdvertOptions): Promise<IAdvert[]> {
  const { placement, userId, visitorKey, topics = [] } = opts;
  const now = new Date();

  const isSubscriber = userId ? await isActiveSubscriber(userId) : false;
  const allowedAudiences = isSubscriber ? ["all", "subscribers_only"] : ["all", "free_only"];

  const andConditions: Record<string, unknown>[] = [
    { $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }] },
    { $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }] },
  ];
  if (topics.length > 0) {
    andConditions.push({
      $or: [{ "targeting.topics": { $size: 0 } }, { "targeting.topics": { $in: topics } }],
    });
  }

  const candidates = await Advert.find({
    placement,
    status: "active",
    "targeting.audience": { $in: allowedAudiences },
    $and: andConditions,
  })
    .sort({ priority: -1, weight: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean<IAdvert[]>();

  if (candidates.length === 0) return [];

  // Look up this viewer's impression history for the candidates in one query.
  const advertIds = candidates.map((c) => c._id);
  const impressionFilter = userId
    ? { advertId: { $in: advertIds }, userId: new mongoose.Types.ObjectId(userId) }
    : visitorKey
    ? { advertId: { $in: advertIds }, visitorKey }
    : null;

  const impressions = impressionFilter
    ? await AdvertImpression.find(impressionFilter).lean()
    : [];
  const impressionByAdvert = new Map(impressions.map((i) => [String(i.advertId), i]));

  return candidates.filter((c) => {
    const imp = impressionByAdvert.get(String(c._id));
    if (!imp) return true;
    if (c.maxImpressionsPerUser > 0 && imp.impressions >= c.maxImpressionsPerUser) return false;
    // "session"/"always" popups may resurface; "once" is permanent once dismissed.
    if (imp.dismissed && c.dismissBehavior === "once") return false;
    return true;
  });
}

/** Single-slot placements (feed_card, in_article, notification_banner, modal_popup): one weighted-random pick from the top priority tier, so same-priority adverts rotate instead of one always winning. */
export async function selectAdvertForPlacement(opts: SelectAdvertOptions): Promise<IAdvert | null> {
  const eligible = await getEligibleCandidates(opts);
  if (eligible.length === 0) return null;

  const topPriority = eligible[0].priority;
  const pool = eligible.filter((c) => c.priority === topPriority);
  const totalWeight = pool.reduce((sum, c) => sum + (c.weight || 1), 0);

  let r = Math.random() * totalWeight;
  for (const c of pool) {
    r -= c.weight || 1;
    if (r <= 0) return c;
  }
  return pool[0];
}

/** Multi-slot placements (currently just "hero"): up to `limit` eligible adverts, priority desc then weight desc — e.g. the hero carousel's sponsored slides. */
export async function selectAdvertsForPlacement(opts: SelectAdvertOptions, limit: number): Promise<IAdvert[]> {
  const eligible = await getEligibleCandidates(opts);
  return eligible.slice(0, limit);
}

/* ── Serialization ─────────────────────────────────────────────────────── */

/** What the reader-facing delivery endpoint exposes — creative + display rules only. */
export function serializeAdvertForClient(a: IAdvert) {
  return {
    id: String(a._id),
    type: a.type,
    placement: a.placement,
    title: a.title,
    body: a.body ?? "",
    image: a.image ? { url: a.image.url, width: a.image.width ?? null, height: a.image.height ?? null } : null,
    ctaLabel: a.ctaLabel ?? "Learn more",
    ctaUrl: a.ctaUrl ?? "",
    dismissBehavior: a.dismissBehavior,
    popupDelaySeconds: a.popupDelaySeconds,
  };
}

/** What the owner/admin management API exposes — full lifecycle + metrics. */
export function serializeAdvertFull(a: IAdvert) {
  return {
    id: String(a._id),
    type: a.type,
    placement: a.placement,
    status: a.status,
    title: a.title,
    body: a.body ?? "",
    image: a.image ? { url: a.image.url, publicId: a.image.publicId, width: a.image.width ?? null, height: a.image.height ?? null } : null,
    ctaLabel: a.ctaLabel ?? "",
    ctaUrl: a.ctaUrl ?? "",
    createdBy: String(a.createdBy),
    requiresReview: a.requiresReview,
    submittedAt: a.submittedAt ?? null,
    reviewedBy: a.reviewedBy ? String(a.reviewedBy) : null,
    reviewedAt: a.reviewedAt ?? null,
    reviewNote: a.reviewNote ?? "",
    advertiserName: a.advertiserName ?? "",
    advertiserContact: a.advertiserContact ?? "",
    creatorId: a.creatorId ? String(a.creatorId) : null,
    postId: a.postId ? String(a.postId) : null,
    targeting: {
      topics: a.targeting?.topics ?? [],
      audience: a.targeting?.audience ?? "all",
      locations: a.targeting?.locations ?? [],
    },
    startAt: a.startAt ?? null,
    endAt: a.endAt ?? null,
    priority: a.priority,
    weight: a.weight,
    maxImpressionsPerUser: a.maxImpressionsPerUser,
    dismissBehavior: a.dismissBehavior,
    popupDelaySeconds: a.popupDelaySeconds,
    billable: a.billable,
    billing: a.billing ?? null,
    metrics: {
      impressions: a.metrics?.impressions ?? 0,
      clicks: a.metrics?.clicks ?? 0,
      uniqueImpressions: a.metrics?.uniqueImpressions ?? 0,
      ctr: a.metrics?.impressions ? a.metrics.clicks / a.metrics.impressions : 0,
    },
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/* ── Tracking ──────────────────────────────────────────────────────────── */

function impressionFilter(advertId: string, viewer: Viewer) {
  return viewer.userId
    ? { advertId: new mongoose.Types.ObjectId(advertId), userId: new mongoose.Types.ObjectId(viewer.userId) }
    : { advertId: new mongoose.Types.ObjectId(advertId), visitorKey: viewer.visitorKey };
}

/** Records one impression for the viewer; increments Advert.metrics (unique on the viewer's first). */
export async function recordImpression(advertId: string, viewer: Viewer): Promise<void> {
  if (!viewer.userId && !viewer.visitorKey) return;

  const updated = await AdvertImpression.findOneAndUpdate(
    impressionFilter(advertId, viewer),
    { $inc: { impressions: 1 }, $set: { lastSeenAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const isFirstImpression = updated.impressions === 1;
  await Advert.findByIdAndUpdate(advertId, {
    $inc: {
      "metrics.impressions": 1,
      ...(isFirstImpression ? { "metrics.uniqueImpressions": 1 } : {}),
    },
  });
}

/** Records a click for the viewer; increments Advert.metrics.clicks. */
export async function recordClick(advertId: string, viewer: Viewer): Promise<void> {
  if (!viewer.userId && !viewer.visitorKey) return;

  await AdvertImpression.findOneAndUpdate(
    impressionFilter(advertId, viewer),
    { $set: { clicked: true, lastSeenAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Advert.findByIdAndUpdate(advertId, { $inc: { "metrics.clicks": 1 } });
}

/** Records a dismissal (popups). Whether this excludes future delivery depends on dismissBehavior — see selectAdvertForPlacement. */
export async function recordDismiss(advertId: string, viewer: Viewer): Promise<void> {
  if (!viewer.userId && !viewer.visitorKey) return;

  await AdvertImpression.findOneAndUpdate(
    impressionFilter(advertId, viewer),
    { $set: { dismissed: true, lastSeenAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Lounge, LoungeMember } from "@/models/lounge";
import { Subscription } from "@/models/subscription";

/**
 * Lounge access resolver — Nomeo.
 * -------------------------------
 * One place that answers "can this user enter / chat in this lounge?", branching
 * on the lounge kind:
 *
 *   kind "platform" (open) → any authenticated user may join. No subscription.
 *       Join is lightweight + auto-accepted: a LoungeMember row is created
 *       (so bans, counts, last-read work) but there is no pending step.
 *
 *   kind "creator" (gated) → must hold an active subscription AND have an
 *       accepted membership AND not be banned.
 *
 * Common to both: lounge must be active (not closed/suspended) and the user
 * must not be banned.
 */

const ACTIVE_SUB_STATUSES = ["active", "trialing"];

export interface LoungeAccessResult {
  canView: boolean; // can read messages
  canChat: boolean; // can send messages
  reason:
    | "ok"
    | "not_authenticated"
    | "lounge_unavailable"
    | "banned"
    | "needs_subscription"
    | "needs_acceptance"
    | "muted";
}

/**
 * Resolve a user's access to a lounge. Does NOT create membership — call
 * joinOpenLounge() for the lightweight auto-join on open lounges.
 */
export async function resolveLoungeAccess(
  loungeId: string,
  userId?: string | null
): Promise<LoungeAccessResult> {
  await connectDB();

  const lounge = await Lounge.findById(loungeId)
    .select("kind accessType status isSuspended isMuted bannedMembers creatorId")
    .lean<{
      _id: mongoose.Types.ObjectId;
      kind: "creator" | "platform";
      accessType: "subscribers" | "authenticated";
      status: string;
      isSuspended: boolean;
      isMuted: boolean;
      bannedMembers: mongoose.Types.ObjectId[];
      creatorId?: mongoose.Types.ObjectId;
    } | null>();

  if (!lounge || lounge.status !== "active" || lounge.isSuspended) {
    return { canView: false, canChat: false, reason: "lounge_unavailable" };
  }

  if (!userId) {
    return { canView: false, canChat: false, reason: "not_authenticated" };
  }

  const viewerId = new mongoose.Types.ObjectId(userId);
  const isBanned = (lounge.bannedMembers ?? []).some((b) => String(b) === userId);
  if (isBanned) {
    return { canView: false, canChat: false, reason: "banned" };
  }

  // ── Creator always has full access to their own lounge ───────────────────
  // Skip subscription + membership checks entirely — creators can always view
  // and chat regardless of lounge kind, membership status or mute state.
  const isCreator = lounge.creatorId && String(lounge.creatorId) === userId;
  if (isCreator) {
    return { canView: true, canChat: true, reason: "ok" };
  }

  // ── Open / platform lounge: any authenticated user ──────────────────────
  if (lounge.kind === "platform" || lounge.accessType === "authenticated") {
    // chat unless the room is globally muted (creator/admin broadcast mode)
    return { canView: true, canChat: !lounge.isMuted, reason: lounge.isMuted ? "muted" : "ok" };
  }

  // ── Creator lounge: subscription + accepted membership ──────────────────
  const sub = await Subscription.findOne({
    subscriberId: viewerId,
    status: { $in: ACTIVE_SUB_STATUSES },
    currentPeriodEnd: { $gte: new Date() },
  })
    .select("_id")
    .lean();

  if (!sub) {
    return { canView: false, canChat: false, reason: "needs_subscription" };
  }

  const member = await LoungeMember.findOne({ loungeId: lounge._id, userId: viewerId })
    .select("status")
    .lean<{ status: string } | null>();

  if (!member || member.status !== "accepted") {
    return { canView: false, canChat: false, reason: "needs_acceptance" };
  }

  return { canView: true, canChat: !lounge.isMuted, reason: lounge.isMuted ? "muted" : "ok" };
}

/**
 * Lightweight auto-join for an OPEN (platform) lounge. Idempotent: creates an
 * accepted LoungeMember if one doesn't exist, otherwise returns the existing
 * one. Rejects if the lounge isn't open or the user is banned.
 */
export async function joinOpenLounge(loungeId: string, userId: string) {
  await connectDB();

  const lounge = await Lounge.findById(loungeId).select("kind accessType status isSuspended bannedMembers");
  if (!lounge || lounge.status !== "active" || lounge.isSuspended) {
    throw new Error("LOUNGE_UNAVAILABLE");
  }
  if (lounge.kind !== "platform" && lounge.accessType !== "authenticated") {
    throw new Error("NOT_AN_OPEN_LOUNGE");
  }
  if ((lounge.bannedMembers ?? []).some((b: mongoose.Types.ObjectId) => String(b) === userId)) {
    throw new Error("BANNED");
  }

  const viewerId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // Was there already a membership? Decides whether to bump the counter.
  const existing = await LoungeMember.findOne({ loungeId: lounge._id, userId: viewerId }).select("_id status");

  const member = await LoungeMember.findOneAndUpdate(
    { loungeId: lounge._id, userId: viewerId },
    {
      $setOnInsert: {
        loungeId: lounge._id,
        userId: viewerId,
        status: "accepted",
        role: "member",
        requestedAt: now,
        respondedAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Only bump the denormalised counter when this is a brand-new membership.
  if (!existing) {
    await Lounge.updateOne({ _id: lounge._id }, { $inc: { membersCount: 1 } });
  }

  return member;
}
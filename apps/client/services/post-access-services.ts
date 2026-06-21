
"use server"

// lib/post-access.service.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { Profile } from "@/models/profile";
import { Subscription } from "@/models/subscription";

/**
 * Post access resolver — Nomeo.
 * -----------------------------
 * Single source of truth for "can this viewer read this post?". Reading and
 * writing are SEPARATE concerns: being a creator grants no reading privilege.
 * The only things that grant access to a PAID post are:
 *
 *   1. Authorship  — you can always read your own post (or one you co-author).
 *   2. Subscription — an active platform membership.
 *   3. Free credit  — Profile.freeReadsRemaining > 0 (consumed on read).
 *
 * Role (user/creator/moderator/admin) is deliberately NOT consulted for paid
 * access. A creator reading someone else's paid post needs membership or a
 * credit like anyone else — this closes the "register as creator to read free"
 * loophole. (Admins/moderators may be granted a separate staff override later;
 * it is intentionally not a side effect of being a creator.)
 *
 * This resolver only DECIDES access; it does not consume credits or record the
 * read. Call consumeFreeRead() + record a PostRead separately when the reader
 * actually opens the post, so a mere capability check never burns a credit.
 */

export type AccessMethod = "free_post" | "free_credit" | "subscription" | "author";

export interface AccessResult {
  canRead: boolean;
  /** How access is (or would be) granted. Null when canRead is false. */
  method: AccessMethod | null;
  /** True when the post is paid and the only thing standing in the way is membership. */
  needsMembership: boolean;
  /** Free-read credits the viewer has left (for paid posts, non-subscribers). */
  freeReadsRemaining: number;
  /** Whether the viewer is the author / a co-author. */
  isAuthor: boolean;
}

const ACTIVE_SUB_STATUSES = ["active", "trialing"];

/**
 * Resolve read access for a post.
 *
 * @param postId   the post being viewed
 * @param userId   the viewer's user id, or null/undefined for guests
 */
export async function resolvePostAccess(
  postId: string,
  userId?: string | null
): Promise<AccessResult> {
  await connectDB();

  const post = await Post.findById(postId).select("access authorId coAuthors status").lean<{
    _id: mongoose.Types.ObjectId;
    access: "free" | "paid";
    authorId: mongoose.Types.ObjectId;
    coAuthors?: Array<{ userId: mongoose.Types.ObjectId; status: string }>;
  } | null>();

  if (!post) {
    return { canRead: false, method: null, needsMembership: false, freeReadsRemaining: 0, isAuthor: false };
  }

  // Free posts: anyone, including guests. No credit, no membership.
  if (post.access === "free") {
    return { canRead: true, method: "free_post", needsMembership: false, freeReadsRemaining: 0, isAuthor: false };
  }

  // From here the post is PAID.

  // Guests can never read a paid post.
  if (!userId) {
    return { canRead: false, method: null, needsMembership: true, freeReadsRemaining: 0, isAuthor: false };
  }

  const viewerId = new mongoose.Types.ObjectId(userId);

  // 1. Authorship — author or accepted co-author reads their own work free.
  const isAuthor =
    String(post.authorId) === userId ||
    (post.coAuthors ?? []).some(
      (c) => String(c.userId) === userId && c.status === "accepted"
    );
  if (isAuthor) {
    return { canRead: true, method: "author", needsMembership: false, freeReadsRemaining: 0, isAuthor: true };
  }

  // 2. Active subscription — role-agnostic.
  const sub = await Subscription.findOne({
    subscriberId: viewerId,
    status: { $in: ACTIVE_SUB_STATUSES },
    currentPeriodEnd: { $gte: new Date() },
  })
    .select("_id")
    .lean();

  if (sub) {
    return { canRead: true, method: "subscription", needsMembership: false, freeReadsRemaining: 0, isAuthor: false };
  }

  // 3. Free-read credits.
  const profile = await Profile.findOne({ userId: viewerId })
    .select("freeReadsRemaining")
    .lean<{ freeReadsRemaining?: number } | null>();
  const credits = profile?.freeReadsRemaining ?? 0;

  if (credits > 0) {
    return { canRead: true, method: "free_credit", needsMembership: false, freeReadsRemaining: credits, isAuthor: false };
  }

  // No membership, no credits → must subscribe.
  return { canRead: false, method: null, needsMembership: true, freeReadsRemaining: 0, isAuthor: false };
}

/**
 * Consume one free-read credit, atomically and only if one remains.
 * Returns the credits left after the decrement, or null if none were available
 * (caller should treat null as "could not grant via credit").
 *
 * Call this ONLY when the reader actually opens a paid post under the
 * "free_credit" method — never on a capability check.
 */
export async function consumeFreeRead(userId: string): Promise<number | null> {
  await connectDB();

  const updated = await Profile.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId), freeReadsRemaining: { $gt: 0 } },
    { $inc: { freeReadsRemaining: -1 } },
    { new: true, projection: { freeReadsRemaining: 1 } }
  ).lean<{ freeReadsRemaining: number } | null>();

  return updated ? updated.freeReadsRemaining : null;
}
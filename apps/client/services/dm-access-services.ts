import mongoose from "mongoose";
import { Conversation, UserBlock, makePairKey } from "@/models/direct-message";
import { ConnectionRequest } from "@/models/connection-request";
import { connectDB } from "@/lib/connect-to-database";

/**
 * Direct-message access resolver — Nomeo.
 * ---------------------------------------
 * Decides whether two users may DM, and gets/creates their conversation.
 *
 * Rule (your choice): users may DM only if they are CONNECTED — an accepted
 * ConnectionRequest exists between them (either direction) — and neither has
 * blocked the other.
 *
 * Blocking is one-directional but mutually disabling: if EITHER side blocked
 * the other, messaging is off for both.
 */

export interface DmAccessResult {
  canMessage: boolean;
  reason: "ok" | "not_connected" | "blocked" | "self" | "not_authenticated";
}

/** Are two users connected (accepted ConnectionRequest, either direction)? */
async function areConnected(a: string, b: string): Promise<boolean> {
  const conn = await ConnectionRequest.findOne({
    status: "accepted",
    $or: [
      { requesterId: a, recipientId: b },
      { requesterId: b, recipientId: a },
    ],
  })
    .select("_id")
    .lean();
  return !!conn;
}

/** Has either user blocked the other? */
async function eitherBlocked(a: string, b: string): Promise<boolean> {
  const block = await UserBlock.findOne({
    $or: [
      { blockerId: a, blockedId: b },
      { blockerId: b, blockedId: a },
    ],
  })
    .select("_id")
    .lean();
  return !!block;
}

/**
 * Resolve whether `userId` may message `otherId`. Does not create anything.
 */
export async function resolveDmAccess(userId: string | null | undefined, otherId: string): Promise<DmAccessResult> {
  if (!userId) return { canMessage: false, reason: "not_authenticated" };
  if (userId === otherId) return { canMessage: false, reason: "self" };

  await connectDB();

  if (await eitherBlocked(userId, otherId)) {
    return { canMessage: false, reason: "blocked" };
  }
  if (!(await areConnected(userId, otherId))) {
    return { canMessage: false, reason: "not_connected" };
  }
  return { canMessage: true, reason: "ok" };
}

/**
 * Get the existing conversation between two users, or create it — but only if
 * they're allowed to message. Returns { conversation } or throws a coded error
 * the route can translate to a status.
 */
export async function getOrCreateConversation(userId: string, otherId: string) {
  const access = await resolveDmAccess(userId, otherId);
  if (!access.canMessage) {
    throw new Error(access.reason.toUpperCase()); // NOT_CONNECTED | BLOCKED | SELF | ...
  }

  const pairKey = makePairKey(userId, otherId);

  const conversation = await Conversation.findOneAndUpdate(
    { pairKey },
    {
      $setOnInsert: {
        pairKey,
        participants: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(otherId)],
        unread: {},
        hiddenFor: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return conversation;
}

/**
 * Verify a user is a participant of a conversation AND still allowed to message
 * the other party (re-checks connection + block per your rule, so a later
 * unfriend/block stops new messages even on an existing thread).
 */
export async function assertCanUseConversation(conversationId: string, userId: string) {
  await connectDB();

  const convo = await Conversation.findById(conversationId).select("participants").lean<{
    _id: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
  } | null>();

  if (!convo) throw new Error("NOT_FOUND");

  const ids = convo.participants.map((p) => String(p));
  if (!ids.includes(userId)) throw new Error("NOT_A_PARTICIPANT");

  const otherId = ids.find((id) => id !== userId)!;
  const access = await resolveDmAccess(userId, otherId);
  if (!access.canMessage) throw new Error(access.reason.toUpperCase());

  return { convo, otherId };
}
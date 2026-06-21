import mongoose from "mongoose";
import { Notification, type NotificationType } from "@/models/notification";
import { bumpUserActivity } from "@/lib/server/ably";
import { connectDB } from "./connect-to-database";

/**
 * createNotification — Nomeo.
 * ---------------------------
 * One place to create an in-app notification. It writes the Notification doc
 * AND pushes a real-time activity bump to the recipient's Ably channel, so the
 * navbar bell updates instantly. Use this everywhere instead of calling
 * Notification.create(...) directly — then every notification is real-time.
 *
 * Never throws on the realtime step (push is best-effort; the DB write is the
 * source of truth, and the 60s safety poll catches any missed bump).
 *
 * TTL: pass `expiresInDays` to auto-expire (your schema has a TTL index on
 * expiresAt). Defaults to 90 days; pass null to keep until manually cleared.
 *
 * Example:
 *   await createNotification({
 *     recipientId: post.authorId,
 *     type: "post_liked",
 *     actorId: currentUser.id,
 *     message: `${currentUser.displayName} liked your post.`,
 *     entityType: "post",
 *     entityId: post._id,
 *   });
 */

type IdLike = string | mongoose.Types.ObjectId;

export interface CreateNotificationInput {
  recipientId: IdLike;
  type: NotificationType;
  message: string;
  actorId?: IdLike;
  entityType?: "post" | "comment" | "lounge_message" | "connection_request" | "subscription" | "user" | "report" | "earning";
  entityId?: IdLike;
  /** Days until auto-expiry. Default 90. Pass null to never auto-expire. */
  expiresInDays?: number | null;
}

function toObjectId(v: IdLike): mongoose.Types.ObjectId {
  return typeof v === "string" ? new mongoose.Types.ObjectId(v) : v;
}

export async function createNotification(input: CreateNotificationInput) {
  const {
    recipientId,
    type,
    message,
    actorId,
    entityType,
    entityId,
    expiresInDays = 90,
  } = input;

  // Don't notify yourself (e.g. liking your own post).
  if (actorId && String(actorId) === String(recipientId)) return null;

  await connectDB();

  const expiresAt =
    expiresInDays == null ? undefined : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const doc = await Notification.create({
    recipientId: toObjectId(recipientId),
    type,
    message: message.slice(0, 500),
    actorId: actorId ? toObjectId(actorId) : undefined,
    entityType,
    entityId: entityId ? toObjectId(entityId) : undefined,
    expiresAt,
  });

  // Real-time: light up the recipient's bell. Best-effort — never blocks/throws.
  bumpUserActivity(String(recipientId), "notification").catch(() => {});

  return doc;
}

/**
 * createNotifications — batch helper for fan-out (e.g. notify many followers of
 * a new post). Inserts all docs in one write, then bumps each recipient.
 */
export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];
  await connectDB();

  const now = Date.now();
  const docs = inputs
    .filter((i) => !(i.actorId && String(i.actorId) === String(i.recipientId)))
    .map((i) => ({
      recipientId: toObjectId(i.recipientId),
      type: i.type,
      message: i.message.slice(0, 500),
      actorId: i.actorId ? toObjectId(i.actorId) : undefined,
      entityType: i.entityType,
      entityId: i.entityId ? toObjectId(i.entityId) : undefined,
      expiresAt:
        i.expiresInDays === null
          ? undefined
          : new Date(now + (i.expiresInDays ?? 90) * 24 * 60 * 60 * 1000),
    }));

  if (docs.length === 0) return [];

  const created = await Notification.insertMany(docs, { ordered: false });

  // Bump each unique recipient once.
  const recipients = new Set(docs.map((d) => String(d.recipientId)));
  for (const r of recipients) bumpUserActivity(r, "notification").catch(() => {});

  return created;
}
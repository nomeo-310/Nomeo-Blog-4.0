import mongoose, { Schema, Document } from "mongoose";

/**
 * Lounge Model
 * ------------
 * A creator can optionally open a Lounge — a real-time discussion space
 * for their paid, accepted subscribers.
 *
 * Access rules (enforced at the application layer):
 *   1. The reader must have an ACTIVE subscription to the creator
 *      (Subscription.status === "active" | "trialing").
 *   2. The creator must have explicitly accepted their membership request
 *      (LoungeMember.status === "accepted").
 *   3. The reader must not be in Lounge.bannedMembers.
 *
 * A Lounge is created by the creator from the frontend — not auto-created.
 * Only creators (User.role === "creator") can own a lounge.
 *
 * Three schemas in this file:
 *   Lounge        →  room config and metadata
 *   LoungeMember  →  membership request + acceptance + last-read cursor
 *   LoungeMessage →  persistent chat messages (WebSocket handles transport)
 *
 * Live-chat notes
 * ---------------
 * - Initial load: REST query fetches last N messages from MongoDB.
 * - Real-time: WebSocket emits new messages after that.
 * - Presence / typing: Redis only — never written to MongoDB.
 * - `clientTempId` on LoungeMessage lets the frontend reconcile optimistic
 *   renders with the server-confirmed _id.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type LoungeStatus        = "active" | "closed" | "suspended";
export type LoungeMemberStatus  = "pending" | "accepted" | "declined" | "removed";
export type LoungeMemberRole    = "member" | "moderator" | "creator";
export type MessageDeliveryStatus = "sending" | "delivered" | "failed";
export type MessageReportReason =
  | "spam" | "harassment" | "hate_speech"
  | "misinformation" | "sexual_content" | "other";

/* ══════════════════════════════════════════════════════════════════════════
   Lounge  (room)
   ══════════════════════════════════════════════════════════════════════════ */

export interface ILounge extends Document {
  _id: mongoose.Types.ObjectId;

  /** The creator (User.role === "creator") who owns this lounge */
  creatorId: mongoose.Types.ObjectId;

  name: string;
  description?: string;
  coverImage?: string;

  status: LoungeStatus;

  /** Pinned welcome / rules message */
  pinnedMessageId?: mongoose.Types.ObjectId;

  /**
   * Broadcast-only mode: creator mutes all non-creator members temporarily.
   * Members can still read but cannot send messages.
   */
  isMuted: boolean;

  /** Platform-level suspension by admin/moderator */
  isSuspended: boolean;
  suspendedBy?: mongoose.Types.ObjectId;
  suspendedAt?: Date;
  suspensionReason?: string;

  /** User._ids explicitly banned from this lounge by the creator or a lounge mod */
  bannedMembers: mongoose.Types.ObjectId[];

  /** Denormalised counters */
  membersCount:  number;
  messagesCount: number;

  /**
   * Slow-mode: minimum seconds a member must wait between messages.
   * 0 = no throttle.
   */
  slowModeSeconds: number;

  /** Creator-set maximum message length (hard cap: 4 000 chars) */
  maxMessageLength: number;

  createdAt: Date;
  updatedAt: Date;
}

const LoungeSchema = new Schema<ILounge>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one lounge per creator
      index: true,
    },

    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500, trim: true },
    coverImage:  { type: String },

    status: {
      type: String,
      enum: ["active", "closed", "suspended"],
      default: "active",
      index: true,
    },

    pinnedMessageId: { type: Schema.Types.ObjectId, ref: "LoungeMessage" },
    isMuted:         { type: Boolean, default: false },

    isSuspended:      { type: Boolean, default: false },
    suspendedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    suspendedAt:      { type: Date },
    suspensionReason: { type: String, maxlength: 500 },

    bannedMembers: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    membersCount:     { type: Number, default: 0, min: 0 },
    messagesCount:    { type: Number, default: 0, min: 0 },
    slowModeSeconds:  { type: Number, default: 0,    min: 0, max: 3600 },
    maxMessageLength: { type: Number, default: 4000, min: 10, max: 4000 },
  },
  { timestamps: true, collection: "lounges" }
);

export const Lounge =
  mongoose.models.Lounge ?? mongoose.model<ILounge>("Lounge", LoungeSchema);

/* ══════════════════════════════════════════════════════════════════════════
   LoungeMember  — membership request, acceptance gate, last-read cursor
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Flow:
 *   1. Subscriber (with active Subscription to this creator) requests to join.
 *      → LoungeMember created with status "pending".
 *   2. Creator (or lounge moderator) accepts or declines.
 *      → status → "accepted" | "declined"
 *   3. Accepted members can chat. Removed members (status "removed") lose access.
 *
 * The subscription must remain active for access to be maintained.
 * Service layer checks Subscription.status on every lounge join/message.
 */

export interface ILoungeMember extends Document {
  _id: mongoose.Types.ObjectId;

  loungeId: mongoose.Types.ObjectId;
  userId:   mongoose.Types.ObjectId;

  /**
   * Back-reference to the active Subscription that qualifies this member.
   * If the subscription expires, the member loses access even if accepted.
   */
  subscriptionId: mongoose.Types.ObjectId;

  status: LoungeMemberStatus;

  role: LoungeMemberRole;

  /** When the membership request was sent */
  requestedAt: Date;

  /** When the creator/mod responded */
  respondedAt?: Date;

  /** Who accepted or declined (creator or a lounge moderator) */
  respondedBy?: mongoose.Types.ObjectId;

  /**
   * Last LoungeMessage._id seen by this member.
   * Used for unread-badge calculation. Updated client-side on scroll-to-bottom.
   */
  lastReadMessageId?: mongoose.Types.ObjectId | null;
  lastReadAt?: Date;

  /** Member has muted notifications for this lounge (personal preference) */
  notificationsMuted: boolean;

  /**
   * Creator or lounge-mod has silenced this member:
   * they can read but cannot send messages.
   */
  isSilenced: boolean;
  silencedBy?: mongoose.Types.ObjectId;
  silencedAt?: Date;
  /** Null = indefinite silence */
  silenceExpiresAt?: Date;

  /** When the member last sent a message — used for slow-mode enforcement */
  lastMessageAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const LoungeMemberSchema = new Schema<ILoungeMember>(
  {
    loungeId: { type: Schema.Types.ObjectId, ref: "Lounge", required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "removed"],
      default: "pending",
      index: true,
    },

    role: {
      type: String,
      enum: ["member", "moderator", "creator"],
      default: "member",
    },

    requestedAt:  { type: Date, default: () => new Date() },
    respondedAt:  { type: Date },
    respondedBy:  { type: Schema.Types.ObjectId, ref: "User" },

    lastReadMessageId: { type: Schema.Types.ObjectId, ref: "LoungeMessage", default: null },
    lastReadAt:        { type: Date },

    notificationsMuted: { type: Boolean, default: false },

    isSilenced:       { type: Boolean, default: false },
    silencedBy:       { type: Schema.Types.ObjectId, ref: "User" },
    silencedAt:       { type: Date },
    silenceExpiresAt: { type: Date },

    lastMessageAt: { type: Date },
  },
  { timestamps: true, collection: "lounge_members" }
);

/** One membership per user per lounge */
LoungeMemberSchema.index({ loungeId: 1, userId: 1 }, { unique: true });

/** Creator's pending-requests inbox */
LoungeMemberSchema.index({ loungeId: 1, status: 1, requestedAt: -1 });

export const LoungeMember =
  mongoose.models.LoungeMember ??
  mongoose.model<ILoungeMember>("LoungeMember", LoungeMemberSchema);

/* ══════════════════════════════════════════════════════════════════════════
   LoungeMessage  — persistent chat messages
   ══════════════════════════════════════════════════════════════════════════ */

export interface ILoungeMessageReport {
  reportedBy: mongoose.Types.ObjectId;
  reason: MessageReportReason;
  details?: string;
  reportedAt: Date;
  reviewed:   boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

export interface ILoungeMessage extends Document {
  _id: mongoose.Types.ObjectId;

  loungeId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;

  /**
   * Client-generated UUID for optimistic rendering.
   * The frontend renders the message immediately using this ID,
   * then swaps it for the server-assigned _id on confirmation.
   * Sparse unique index prevents double-saves from retries.
   */
  clientTempId?: string;

  /**
   * Set by the WebSocket server once the message is persisted and broadcast.
   * "sending"   → in flight (client optimistic state — never written to DB)
   * "delivered" → saved and emitted to the room
   * "failed"    → persistence failed
   */
  deliveryStatus: MessageDeliveryStatus;

  /** Threaded reply — one level deep */
  replyToId?: mongoose.Types.ObjectId | null;

  /**
   * Snapshot of the parent message for display.
   * Prevents broken reply previews if the original is deleted.
   */
  replyToSnapshot?: {
    authorId: mongoose.Types.ObjectId;
    body: string; // truncated to 200 chars
  };

  /** Plain text or light markdown — no raw HTML */
  body: string;

  attachmentUrl?:      string;
  attachmentMimeType?: string;

  isEdited:     boolean;
  editedAt?:    Date;
  /** Previous body stored for moderation audit */
  previousBody?: string;

  isRemoved:      boolean;
  removedBy?:     mongoose.Types.ObjectId;
  removedAt?:     Date;
  removalReason?: string;

  isDeletedByAuthor: boolean;

  /** Emoji reaction counts map e.g. { "👍": 4, "🔥": 2 } */
  reactions: Map<string, number>;

  reports:             ILoungeMessageReport[];
  pendingReportsCount: number;

  /** System/event messages e.g. "Alice joined" — not editable or reportable */
  isSystemMessage: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const LoungeMessageReportSchema = new Schema<ILoungeMessageReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "misinformation", "sexual_content", "other"],
      required: true,
    },
    details:    { type: String, maxlength: 1000 },
    reportedAt: { type: Date, default: () => new Date() },
    reviewed:   { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: true }
);

const LoungeMessageSchema = new Schema<ILoungeMessage>(
  {
    loungeId: { type: Schema.Types.ObjectId, ref: "Lounge", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },

    clientTempId: { type: String, trim: true },

    deliveryStatus: {
      type: String,
      enum: ["sending", "delivered", "failed"],
      default: "delivered",
    },

    replyToId: { type: Schema.Types.ObjectId, ref: "LoungeMessage", default: null },

    replyToSnapshot: {
      authorId: { type: Schema.Types.ObjectId, ref: "User" },
      body:     { type: String, maxlength: 200 },
    },

    body:               { type: String, required: true, trim: true, maxlength: 4000 },
    attachmentUrl:      { type: String },
    attachmentMimeType: { type: String, maxlength: 100 },

    isEdited:     { type: Boolean, default: false },
    editedAt:     { type: Date },
    previousBody: { type: String, maxlength: 4000 },

    isRemoved:      { type: Boolean, default: false },
    removedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    removedAt:      { type: Date },
    removalReason:  { type: String, maxlength: 500 },

    isDeletedByAuthor: { type: Boolean, default: false },

    reactions: { type: Map, of: Number, default: () => new Map() },

    reports:             { type: [LoungeMessageReportSchema], default: [] },
    pendingReportsCount: { type: Number, default: 0, min: 0 },

    isSystemMessage: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "lounge_messages" }
);

/** Cursor-paginated feed: visible messages in a lounge oldest → newest */
LoungeMessageSchema.index({ loungeId: 1, isRemoved: 1, createdAt: 1 });

/** Unread count: messages newer than a member's lastReadMessageId */
LoungeMessageSchema.index({ loungeId: 1, _id: 1 });

/** Prevent duplicate saves from client retries */
LoungeMessageSchema.index(
  { loungeId: 1, clientTempId: 1 },
  { unique: true, sparse: true }
);

/** Moderator queue */
LoungeMessageSchema.index({ pendingReportsCount: -1 });

export const LoungeMessage =
  mongoose.models.LoungeMessage ??
  mongoose.model<ILoungeMessage>("LoungeMessage", LoungeMessageSchema);
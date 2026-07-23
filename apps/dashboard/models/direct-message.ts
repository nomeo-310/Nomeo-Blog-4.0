import mongoose, { Schema, Document } from "mongoose";

/**
 * Direct Messages — Nomeo.
 * ------------------------
 * One-to-one private chat between two CONNECTED users (an accepted
 * ConnectionRequest must exist between them). This is separate from the Lounge
 * (group chat) entirely — different access model, different privacy rules.
 *
 * Three schemas in this file:
 *   Conversation   → the private thread between exactly two users
 *   DirectMessage  → a message within a conversation
 *   UserBlock      → a one-directional block (A blocks B)
 *
 * Access (enforced in the service layer, see dm-access.service.ts):
 *   - Both users must be connected (accepted ConnectionRequest), OR an existing
 *     conversation already exists between them (so an unfriend later doesn't
 *     orphan history, but new messages re-check the relationship per your rule).
 *   - Neither may have blocked the other.
 *
 * Real-time: reuses Ably. Channel per conversation: `dm:<conversationId>`.
 * Like the lounge, messages persist to MongoDB and broadcast via Ably; typing
 * and presence are Ably-only.
 *
 * Privacy note: a conversation is keyed by a deterministic `pairKey` (the two
 * user ids sorted + joined) with a unique index, so there's exactly ONE
 * conversation per pair — no duplicate threads.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type DirectMessageReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "sexual_content"
  | "threat"
  | "other";

/* ══════════════════════════════════════════════════════════════════════════
   Conversation
   ══════════════════════════════════════════════════════════════════════════ */

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;

  /** Exactly two participants. */
  participants: mongoose.Types.ObjectId[];

  /**
   * Deterministic key for the pair: the two ids sorted ascending and joined
   * with "_". Guarantees one conversation per pair via a unique index.
   */
  pairKey: string;

  /** Denormalised preview of the most recent message (for the inbox list). */
  lastMessage?: {
    body: string;
    senderId: mongoose.Types.ObjectId;
    sentAt: Date;
  } | null;

  lastMessageAt?: Date;

  /**
   * Per-participant unread counts, keyed by userId string. A Map keeps it
   * simple to $inc one side and reset the other.
   */
  unread: Map<string, number>;

  /**
   * Per-participant soft-hide: a user can "delete" the conversation from their
   * own inbox without affecting the other person. Stores userIds who've hidden.
   */
  hiddenFor: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length === 2,
        message: "A conversation must have exactly two participants.",
      },
      index: true,
    },
    pairKey: { type: String, required: true, unique: true },

    lastMessage: {
      type: new Schema(
        {
          body: { type: String, maxlength: 200 },
          senderId: { type: Schema.Types.ObjectId, ref: "User" },
          sentAt: { type: Date },
        },
        { _id: false }
      ),
      default: null,
    },
    lastMessageAt: { type: Date, index: true },

    unread: { type: Map, of: Number, default: {} },
    hiddenFor: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
  },
  { timestamps: true, collection: "conversations" }
);

// Fast inbox query: a user's conversations, most recent first.
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

/** Build the deterministic pair key from two user ids (order-independent). */
export function makePairKey(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export const Conversation =
  mongoose.models.Conversation ??
  mongoose.model<IConversation>("Conversation", ConversationSchema);

/* ══════════════════════════════════════════════════════════════════════════
   DirectMessage
   ══════════════════════════════════════════════════════════════════════════ */

export interface IDirectMessageReport {
  reporterId: mongoose.Types.ObjectId;
  reason: DirectMessageReportReason;
  note?: string;
  reportedAt: Date;
}

export interface IDirectMessage extends Document {
  _id: mongoose.Types.ObjectId;

  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;

  body: string;

  /** Optimistic-render reconciliation id (matches lounge pattern). */
  clientTempId?: string;

  /** Read receipt: when the OTHER participant read it (null until then). */
  readAt?: Date | null;

  isEdited: boolean;
  editedAt?: Date;
  previousBody?: string;

  /** Soft delete by the sender (shows "message deleted"). */
  isDeleted: boolean;

  /** Moderation */
  reports: IDirectMessageReport[];
  isRemoved: boolean; // hidden by a moderator
  removedBy?: mongoose.Types.ObjectId;
  removedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DirectMessageReportSchema = new Schema<IDirectMessageReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "sexual_content", "threat", "other"],
      required: true,
    },
    note: { type: String, maxlength: 500 },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    body: { type: String, required: true, trim: true, maxlength: 4000 },

    clientTempId: { type: String, trim: true },

    readAt: { type: Date, default: null },

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    previousBody: { type: String, maxlength: 4000 },

    isDeleted: { type: Boolean, default: false },

    reports: { type: [DirectMessageReportSchema], default: [] },
    isRemoved: { type: Boolean, default: false },
    removedBy: { type: Schema.Types.ObjectId, ref: "User" },
    removedAt: { type: Date },
  },
  { timestamps: true, collection: "direct_messages" }
);

// Message history within a conversation, chronological.
DirectMessageSchema.index({ conversationId: 1, _id: 1 });
DirectMessageSchema.index({ conversationId: 1, isRemoved: 1, createdAt: 1 });
// Idempotent sends (retry-safe), like the lounge.
DirectMessageSchema.index(
  { conversationId: 1, clientTempId: 1 },
  { unique: true, partialFilterExpression: { clientTempId: { $type: "string" } } }
);
// Moderation review queue.
DirectMessageSchema.index({ isRemoved: 1, "reports.reportedAt": -1 });

export const DirectMessage =
  mongoose.models.DirectMessage ??
  mongoose.model<IDirectMessage>("DirectMessage", DirectMessageSchema);

/* ══════════════════════════════════════════════════════════════════════════
   UserBlock  — one-directional block
   ══════════════════════════════════════════════════════════════════════════ */

export interface IUserBlock extends Document {
  _id: mongoose.Types.ObjectId;
  /** The user who created the block */
  blockerId: mongoose.Types.ObjectId;
  /** The user being blocked */
  blockedId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserBlockSchema = new Schema<IUserBlock>(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "user_blocks" }
);

// One block record per (blocker, blocked) pair.
UserBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const UserBlock =
  mongoose.models.UserBlock ?? mongoose.model<IUserBlock>("UserBlock", UserBlockSchema);
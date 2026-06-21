// app/api/dm/conversations/[id]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { DirectMessage } from "@/models/direct-message";
import { publishToDm } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { assertCanUseConversation } from "@/services/dm-access-services";
import { connectDB } from "@/lib/connect-to-database";

/**
 *  PATCH  /api/dm/conversations/[id]/messages/[messageId]  { body }  → edit
 *  DELETE /api/dm/conversations/[id]/messages/[messageId]            → delete
 *
 * Author-only. Edit keeps previousBody for audit; delete is soft (isDeleted).
 * Both broadcast on the dm channel so the other party's view updates live.
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const { id, messageId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body } = await req.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return NextResponse.json({ error: "Body required" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Too long" }, { status: 400 });

    await connectDB();
    await assertCanUseConversation(id, user.id);

    const msg = await DirectMessage.findOne({ _id: messageId, conversationId: id });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.senderId) !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.isDeleted) return NextResponse.json({ error: "Cannot edit" }, { status: 400 });

    msg.previousBody = msg.body;
    msg.body = text;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const payload = { id: String(msg._id), body: text, isEdited: true };
    publishToDm(id, "message.edited", payload).catch(() => {});
    return NextResponse.json({ message: payload });
  } catch (error) {
    const msg = (error as Error).message;
    const status = ["NOT_FOUND", "NOT_A_PARTICIPANT", "NOT_CONNECTED", "BLOCKED"].includes(msg) ? 403 : 500;
    if (status === 500) console.error("[PATCH dm message]", error);
    return NextResponse.json({ error: msg || "Failed" }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const { id, messageId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    await assertCanUseConversation(id, user.id);

    const msg = await DirectMessage.findOne({ _id: messageId, conversationId: id });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.senderId) !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    msg.isDeleted = true;
    msg.body = ""; // clear content on hard-intent soft delete
    await msg.save();

    publishToDm(id, "message.deleted", { id: String(msg._id) }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    const status = ["NOT_FOUND", "NOT_A_PARTICIPANT", "NOT_CONNECTED", "BLOCKED"].includes(msg) ? 403 : 500;
    if (status === 500) console.error("[DELETE dm message]", error);
    return NextResponse.json({ error: msg || "Failed" }, { status });
  }
}
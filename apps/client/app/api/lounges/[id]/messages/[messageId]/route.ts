// app/api/lounges/[id]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { LoungeMessage } from "@/models/lounge";
import { publishToLounge } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 *  PATCH  /api/lounges/[id]/messages/[messageId]  { body }  → edit own message
 *  DELETE /api/lounges/[id]/messages/[messageId]            → delete own message
 *
 * Only the author may edit/delete their own message. Edits keep previousBody
 * for moderation audit; deletes are soft (isDeletedByAuthor) so the thread
 * keeps its shape ("message deleted"). Both broadcast so other clients update.
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
    const msg = await LoungeMessage.findOne({ _id: messageId, loungeId: id });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.authorId) !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.isDeletedByAuthor || msg.isRemoved) return NextResponse.json({ error: "Cannot edit" }, { status: 400 });

    msg.previousBody = msg.body;
    msg.body = text;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const payload = { id: String(msg._id), body: text, isEdited: true };
    publishToLounge(id, "message.edited", payload).catch(() => {});
    return NextResponse.json({ message: payload });
  } catch (error) {
    console.error("[PATCH lounge message]", error);
    return NextResponse.json({ error: "Failed to edit" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const { id, messageId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const msg = await LoungeMessage.findOne({ _id: messageId, loungeId: id });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(msg.authorId) !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    msg.isDeletedByAuthor = true;
    await msg.save();

    publishToLounge(id, "message.deleted", { id: String(msg._id) }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE lounge message]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
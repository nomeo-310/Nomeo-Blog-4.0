// app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Comment } from "@/models/comment";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/comments/[id]
 * --------------------------
 * Soft-deletes the caller's own comment.
 * Sets isDeletedByAuthor = true and clears the body.
 * Does NOT decrement commentsCount — the comment still exists
 * so thread structure is preserved.
 *
 * Moderator hard-deletion is a separate admin action.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });

    await connectDB();

    const comment = await Comment.findById(id);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    // Only the author can delete their own comment
    if (String(comment.authorId) !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (comment.isDeletedByAuthor)
      return NextResponse.json({ success: true }); // already deleted — idempotent

    await Comment.findByIdAndUpdate(id, {
      $set: {
        isDeletedByAuthor: true,
        body: "",          // clear content
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/comments/[id]]", err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
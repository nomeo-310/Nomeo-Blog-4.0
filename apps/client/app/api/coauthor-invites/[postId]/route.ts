// app/api/coauthor-invites/[postId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/create-notification";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/coauthor-invites/[postId]  { action: "accept" | "decline" }
 * --------------------------------------------------------------------
 * The invited co-author accepts or declines their invite on a post.
 *
 * On ACCEPT:
 *   - coAuthors[].status → "accepted"
 *   - Original author is notified ("coauthor_accepted")
 *
 * On DECLINE:
 *   - coAuthors[].status → "declined"
 *   - Original author is notified ("coauthor_declined")
 *   - Declined entries stay in the array (audit trail) but are excluded
 *     from the public byline (showOnByline is irrelevant once declined)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!mongoose.isValidObjectId(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    await connectDB();

    const post = await Post.findById(postId);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const coAuthors = post.coAuthors ?? [];
    const idx = coAuthors.findIndex(
      (ca: any) => String(ca.userId) === user.id && ca.status === "pending"
    );

    if (idx === -1) {
      return NextResponse.json(
        { error: "No pending invite found for you on this post." },
        { status: 404 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    coAuthors[idx].status     = newStatus;
    coAuthors[idx].respondedAt = new Date();
    post.coAuthors = coAuthors;
    await post.save();

    // ── Notify the original author of the decision ───────────────────────
    const responderProfile = await Profile.findOne(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { displayName: 1, username: 1 }
    ).lean() as any;

    const responderName = responderProfile?.displayName || responderProfile?.username || "A co-author";

    await createNotification({
      recipientId: post.authorId,
      type:        action === "accept" ? "coauthor_accepted" : "coauthor_declined",
      actorId:     user.id,
      message:
        action === "accept"
          ? `${responderName} accepted your co-author invite for "${post.title}".`
          : `${responderName} declined your co-author invite for "${post.title}".`,
      entityType: "post",
      entityId:   post._id,
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("[PATCH /api/coauthor-invites/[postId]]", err);
    return NextResponse.json({ error: "Failed to respond to invite" }, { status: 500 });
  }
}
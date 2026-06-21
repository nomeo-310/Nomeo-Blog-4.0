// app/api/coauthor-invites/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/coauthor-invites
 * --------------------------
 * Returns all pending co-author invites for the signed-in user — i.e. posts
 * where they appear in coAuthors[] with status "pending".
 *
 * Used by the activity panel's "Co-author invites" tab.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ invites: [] });

    await connectDB();

    const uid = new mongoose.Types.ObjectId(user.id);

    const posts = await Post.find(
      { "coAuthors.userId": uid, "coAuthors.status": "pending" },
      { title: 1, slug: 1, coverImage: 1, authorId: 1, coAuthors: 1, status: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean<any[]>();

    if (!posts.length) return NextResponse.json({ invites: [] });

    const authorIds = [...new Set(posts.map((p) => String(p.authorId)))]
      .map((id) => new mongoose.Types.ObjectId(id));

    const authorProfiles = await Profile.find(
      { userId: { $in: authorIds } },
      { userId: 1, displayName: 1, username: 1, profileImage: 1 }
    ).lean<any[]>();

    const authorMap = new Map(authorProfiles.map((p) => [String(p.userId), p]));

    const invites = posts.map((post) => {
      const myInvite = post.coAuthors.find(
        (ca: any) => String(ca.userId) === user.id && ca.status === "pending"
      );
      const author = authorMap.get(String(post.authorId));

      return {
        postId:     String(post._id),
        postTitle:  post.title,
        postSlug:   post.slug,
        postStatus: post.status,
        coverImage: post.coverImage?.secureUrl || "",
        role:       myInvite?.role ?? "writer",
        invitedAt:  myInvite?.invitedAt ?? post.createdAt,
        author: {
          id:     String(post.authorId),
          name:   author?.displayName || author?.username || "A creator",
          avatar: author?.profileImage?.url || "",
        },
      };
    });

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("[GET /api/coauthor-invites]", err);
    return NextResponse.json({ invites: [] }, { status: 500 });
  }
}
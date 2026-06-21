// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { createNotifications } from "@/lib/create-notification";
import { mailService } from "@/services/email-services";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

/**
 * POST /api/posts
 * ---------------
 * Creates a new post. Creator-only.
 * Accepts: title, excerpt, content, coverImage ({ url, publicId }), category, tags,
 *          access, seriesId, status ("draft" | "published"), coAuthors
 *
 * Slug is auto-generated from title + author id (unique per author).
 * readingTime is computed from content word count.
 *
 * Co-authors: each invited co-author is saved with status "pending" on the
 * post AND receives a "coauthor_invited" notification so they actually know
 * they were added and can accept/decline from their notifications panel.
 *
 * Newsletter: when publishing with sendAsNewsletter === true, every
 * follower (who hasn't opted out of emailNewPost) gets emailed via
 * mailService.sendPostNewsletter. Inlined below rather than a separate
 * helper. Wrapped in try/catch so a mail failure can't fail an
 * otherwise-successful publish.
 *
 * ASSUMPTIONS in the newsletter block (fix here if your schema differs):
 *   - "follows" collection: { followerId, followingId }
 *   - "settings" collection: { userId, notifications: { emailNewPost } }
 *     Opt-out model — only an explicit `false` excludes someone; a missing
 *     field or doc means they're still subscribed.
 *
 * NOTE: this sends in a loop inside the request. mail-service.ts's own
 * comment says bulk sends should be enqueued one job per recipient via
 * BullMQ instead — fine for small follower counts, but worth moving to a
 * queue once a creator's follower count makes this slow or risks a
 * serverless timeout.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "creator") {
      return NextResponse.json({ error: "Only creators can publish posts", code: "NOT_CREATOR" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const {
      title, excerpt, content, coverImage,
      category, tags, access, seriesId, seriesOrder, status, sendAsNewsletter, coAuthors,
    } = body;

    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    const isPublishing = status === "published";
    if (isPublishing && !excerpt?.trim()) {
      return NextResponse.json({ error: "Excerpt is required before publishing" }, { status: 400 });
    }

    // Generate slug from title — slugify + append short id for uniqueness.
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    // Ensure uniqueness per author.
    const uid = new mongoose.Types.ObjectId(user.id);
    let slug = baseSlug;
    let suffix = 1;
    while (await Post.exists({ authorId: uid, slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // Compute reading time (avg 200 wpm).
    const wordCount = content.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    // Build the co-authors array — dedupe, drop self-invites, validate ids.
    const cleanCoAuthors = Array.isArray(coAuthors)
      ? coAuthors
          .filter((ca: any) => mongoose.isValidObjectId(ca.userId) && ca.userId !== user.id)
          .map((ca: any) => ({
            userId:       new mongoose.Types.ObjectId(ca.userId),
            role:         ["writer", "editor", "reviewer"].includes(ca.role) ? ca.role : "writer",
            status:       "pending" as const,
            showOnByline: ca.showOnByline !== false,
            invitedAt:    new Date(),
          }))
      : [];

    const post = await Post.create({
      authorId: uid,
      title: title.trim(),
      slug,
      excerpt: excerpt?.trim() || "",
      content: content.trim(),
      coverImage: coverImage
        ? { secureUrl: coverImage.secureUrl || coverImage.url || "", publicId: coverImage.publicId || "" }
        : { secureUrl: "", publicId: "" },
      category: category?.trim() || "",
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [],
      access: access === "paid" ? "paid" : "free",
      seriesId:    seriesId ? new mongoose.Types.ObjectId(seriesId) : null,
      seriesOrder: seriesOrder ? Number(seriesOrder) : undefined,
      status: isPublishing ? "published" : "draft",
      publishedAt: isPublishing ? new Date() : null,
      readingTime,
      sendAsNewsletter: isPublishing ? (sendAsNewsletter === true) : false,
      coAuthors: cleanCoAuthors,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
    });

    // Increment postsCount on profile when publishing.
    if (isPublishing) {
      await Profile.updateOne({ userId: uid }, { $inc: { postsCount: 1 } });
    }

    // Author profile is needed for both co-author notifications and the
    // follower newsletter — fetch it once if either is needed.
    let authorProfile: { displayName?: string; username?: string } | null = null;
    if (cleanCoAuthors.length > 0 || (isPublishing && sendAsNewsletter === true)) {
      authorProfile = await Profile.findOne(
        { userId: uid },
        { displayName: 1, username: 1 }
      ).lean() as any;
    }
    const authorName = authorProfile?.displayName || authorProfile?.username || "A creator";

    // ── Notify invited co-authors ────────────────────────────────────────
    if (cleanCoAuthors.length > 0) {
      await createNotifications(
        cleanCoAuthors.map((ca) => ({
          recipientId: ca.userId,
          type:        "coauthor_invited",
          actorId:     uid,
          message:     `${authorName} invited you to co-author "${title.trim()}" as ${ca.role}.`,
          entityType:  "post" as const,
          entityId:    post._id,
        }))
      );
    }

    // ── Email followers (newsletter) — inlined, not a separate helper ───
    if (isPublishing && sendAsNewsletter === true) {
      try {
        const db = mongoose.connection.db!;

        // 1. Who follows this author.
        const follows = await db.collection("follows")
          .find({ followingId: uid }, { projection: { followerId: 1 } })
          .toArray();
        const followerIds = follows.map((f: any) => f.followerId);

        if (followerIds.length > 0) {
          // 2. Their emails (better-auth's "user" collection) + the
          //    author's own email, for replies to go back to them.
          const [users, authorUser] = await Promise.all([
            db.collection("user")
              .find({ _id: { $in: followerIds } }, { projection: { email: 1 } })
              .toArray(),
            db.collection("user")
              .findOne({ _id: uid }, { projection: { email: 1 } }),
          ]);
          const emailById = new Map(users.map((u: any) => [String(u._id), u.email as string]));

          // 3. Who's opted out of "new post" emails specifically.
          const optedOut = await db.collection("settings")
            .find(
              { userId: { $in: followerIds }, "notifications.emailNewPost": false },
              { projection: { userId: 1 } }
            )
            .toArray();
          const optedOutIds = new Set(optedOut.map((s: any) => String(s.userId)));

          const recipients = followerIds
            .filter((id) => !optedOutIds.has(String(id)))
            .map((id) => emailById.get(String(id)))
            .filter((email): email is string => !!email);

          if (recipients.length > 0) {
            const postUrl = `${APP_URL}/post/${post.slug}`;
            // Matches PostNewsletterEmail's own default — sends the
            // recipient to their (authenticated) notification settings
            // rather than a one-click token link.
            const unsubscribeUrl = `${APP_URL}/settings/notifications`;

            const results = await Promise.allSettled(
              recipients.map((to) =>
                mailService.sendPostNewsletter({
                  to,
                  creatorName:    authorName,
                  postTitle:      post.title,
                  excerpt:        post.excerpt,
                  postUrl,
                  coverImageUrl:  post.coverImage?.secureUrl || post.coverImage?.url || undefined,
                  readingTime:    post.readingTime,
                  unsubscribeUrl,
                  creatorReplyTo: authorUser?.email,
                })
              )
            );

            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed > 0) {
              console.error(`[POST /api/posts] newsletter: ${failed}/${recipients.length} sends failed`);
            }
          }
        }
      } catch (mailErr) {
        // Publishing already succeeded — don't fail the request over email.
        console.error("[POST /api/posts] newsletter send failed", mailErr);
      }
    }

    return NextResponse.json({ postId: String(post._id), slug: post.slug, status: post.status });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "A post with this title already exists" }, { status: 409 });
    }
    console.error("[POST /api/posts]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
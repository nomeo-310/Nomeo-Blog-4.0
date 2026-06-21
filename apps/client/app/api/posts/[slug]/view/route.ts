// app/api/posts/[slug]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { getCurrentUser } from "@/lib/session";
import { resolvePostAccess, consumeFreeRead } from "@/services/post-access-services";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[slug]/view
 * ----------------------------
 * Records a view for a post.
 *
 * Always:
 *   • Increments viewsCount
 *
 * For signed-in users only:
 *   • Re-resolves access server-side to get the correct method
 *   • If method === "free_credit" → consumes one credit atomically
 *   • Upserts a PostRead with the correct accessMethod
 *
 * Free posts: viewsCount incremented, PostRead recorded as "free_post".
 * No access re-check needed for free posts (everyone can read them).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    // Get user — non-fatal if not signed in
    const user = await getCurrentUser().catch(() => null);

    await connectDB();

    const post = await Post.findOne(
      { slug, status: "published" },
      { _id: 1, authorId: 1, access: 1 }
    ).lean() as any;

    if (!post) {
      console.warn(`[view] post not found: ${slug}`);
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const pid = post._id as mongoose.Types.ObjectId;

    // ── Always increment viewsCount ──────────────────────────────────────
    await Post.findByIdAndUpdate(pid, { $inc: { viewsCount: 1 } });

    // ── Signed-in user: record PostRead + handle free credits ────────────
    if (user) {
      let accessMethod: string = post.access === "free" ? "free_post" : "subscription";

      // For paid posts, re-resolve to get actual method and handle credits
      if (post.access === "paid") {
        const access = await resolvePostAccess(String(pid), user.id);

        if (!access.canRead) {
          // Shouldn't happen if client-side gating works, but be safe
          return NextResponse.json({ ok: true });
        }

        accessMethod = access.method ?? "subscription";

        // Consume a free credit if that's what granted access
        if (access.method === "free_credit") {
          const remaining = await consumeFreeRead(user.id);
          if (remaining === null) {
            // Credit disappeared (race condition) — don't record read
            return NextResponse.json({ ok: true, creditsExhausted: true });
          }
        }
      }

      // Upsert PostRead — idempotent
      const db = mongoose.connection.db;
      if (db) {
        const now           = new Date();
        const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const uid           = new mongoose.Types.ObjectId(user.id);

        await db.collection("post_reads").updateOne(
          { userId: uid, postId: pid },
          {
            $setOnInsert: {
              userId:              uid,
              postId:              pid,
              creatorId:           post.authorId,
              accessMethod,
              readerIsSubscriber:  accessMethod === "subscription",
              readDurationSeconds: 0,
              completedRead:       false,
              billingPeriod,
              createdAt:           now,
            },
            $set: { updatedAt: now },
          },
          { upsert: true }
        );
      }
    }

    // Revalidate the post page so the next render reflects the new viewsCount
    revalidatePath(`/post/${slug}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/posts/[slug]/view]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import DashboardLayout from "@/components/features/dashboard-layout";
import { PromotionsPage } from "@/app-pages/dashboard/promotions/promotions-page";
import type { EligiblePost } from "@/app-pages/dashboard/promotions/promotion-types";

export const metadata: Metadata = { title: "Promotions" };

/**
 * Promotions route — creator-only. Server-fetches the creator's published
 * posts (the pool eligible to be promoted) and hands them to the client
 * island; the promotions themselves are fetched/mutated client-side via
 * useMyAdverts, since they're mutable state the creator interacts with.
 *
 * Route: app/dashboard/promotions/page.tsx
 */
export default async function Promotions() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const posts = await getPromotablePosts(user.id);

  return (
    <DashboardLayout>
      <PromotionsPage initialPosts={posts} />
    </DashboardLayout>
  );
}

async function getPromotablePosts(userId: string): Promise<EligiblePost[]> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];

    const raw = await db.collection("posts")
      .find(
        { authorId: new mongoose.Types.ObjectId(userId), status: "published", isRemoved: { $ne: true } },
        { projection: { title: 1, slug: 1, excerpt: 1, coverImage: 1 } }
      )
      .sort({ publishedAt: -1 })
      .limit(100)
      .toArray();

    return raw.map((p) => ({
      id:      String(p._id),
      title:   String(p.title || "Untitled"),
      slug:    String(p.slug  || p._id),
      excerpt: String(p.excerpt || ""),
      coverImage: p.coverImage?.secureUrl
        ? { url: p.coverImage.secureUrl, publicId: p.coverImage.publicId || "" }
        : null,
    }));
  } catch { return []; }
}

import mongoose from "mongoose";
import { connectDB } from "./connect-to-database";

/**
 * getCuratedTopics
 * ----------------
 * Returns the admin-curated, active topics for the onboarding interest picker,
 * grouped naturally by their sort/category. Only `isCurated: true` topics show
 * in onboarding (auto-created topics stay out until an admin promotes them).
 *
 * Shape is kept minimal (slug, label, icon) since that's all the picker needs.
 */

export interface TopicOption {
  slug: string;
  label: string;
  icon?: string;
}

export async function getCuratedTopics(): Promise<TopicOption[]> {
  await connectDB();

  const docs = await mongoose.connection
    .db!.collection("topics")
    .find(
      { isCurated: true, status: "active" },
      { projection: { slug: 1, label: 1, icon: 1, _id: 0 } }
    )
    .sort({ category: 1, label: 1 })
    .toArray();

  return docs.map((d) => ({
    slug: d.slug as string,
    label: d.label as string,
    icon: (d.icon as string) ?? undefined,
  }));
}
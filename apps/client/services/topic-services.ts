import { Topic, type ITopic } from "@/models/topic";

/**
 * Topic normalization — Nomeo.
 * ----------------------------
 * Post tags are free text as typed by a creator; this is the layer that
 * reconciles them against the canonical Topic vocabulary (see
 * models/topic.ts) so "AI" and "Artificial Intelligence" end up as the same
 * slug instead of silently fragmenting reader interests, search, and any
 * future recommendation logic.
 *
 * Call normalizeTags() wherever a post's tags are written (create + edit)
 * instead of the old `tags.map(t => t.trim().toLowerCase())`.
 */

const MAX_TAGS = 10;

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Best-effort human label for a newly created topic, e.g. "artificial-intelligence" → "Artificial Intelligence". */
function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Normalizes raw tag input into canonical Topic slugs:
 *   - slugifies each raw string
 *   - resolves aliases and merged topics to their canonical slug
 *   - drops banned topics entirely
 *   - create-on-first-use for anything genuinely new (uncurated,
 *     status "active", awaiting admin curation — never blocks the write)
 *
 * Deduped, capped at MAX_TAGS, order not guaranteed.
 */
export async function normalizeTags(rawTags: unknown): Promise<string[]> {
  if (!Array.isArray(rawTags)) return [];

  const candidateSlugs = [
    ...new Set(
      rawTags
        .map((t) => (typeof t === "string" ? slugify(t) : ""))
        .filter(Boolean)
    ),
  ].slice(0, MAX_TAGS);

  if (candidateSlugs.length === 0) return [];

  const existing = await Topic.find({
    $or: [{ slug: { $in: candidateSlugs } }, { aliases: { $in: candidateSlugs } }],
  }).lean<ITopic[]>();

  const bySlug = new Map(existing.map((t) => [t.slug, t]));
  const byAlias = new Map<string, ITopic>();
  for (const t of existing) {
    for (const alias of t.aliases ?? []) byAlias.set(alias, t);
  }

  const resolved: string[] = [];
  const toCreate: string[] = [];

  for (const slug of candidateSlugs) {
    const topic = bySlug.get(slug) ?? byAlias.get(slug);
    if (!topic) {
      toCreate.push(slug);
      continue;
    }
    if (topic.status === "banned") continue; // silently drop — never block the writer's save
    resolved.push(topic.status === "merged" && topic.mergedInto ? topic.mergedInto : topic.slug);
  }

  if (toCreate.length > 0) {
    // Two creators could race to tag the same brand-new word at once — the
    // unique index on slug is the real guard; a duplicate-key error here
    // just means someone else won the race, which is fine, the slug exists.
    await Promise.all(
      toCreate.map((slug) =>
        Topic.create({ slug, label: titleCaseFromSlug(slug), isCurated: false, status: "active" })
          .catch((err: unknown) => {
            if ((err as { code?: number })?.code !== 11000) throw err;
          })
      )
    );
    resolved.push(...toCreate);
  }

  return [...new Set(resolved)];
}

/**
 * Adjusts Topic.postsCount for the diff between a post's old and new
 * published-tag sets. Pass the tags that stopped counting (removed, or the
 * post was unpublished) and the tags that started counting (added, or the
 * post was newly published) — pass [] for either side that doesn't apply.
 */
export async function adjustTopicPostCounts(removedTags: string[], addedTags: string[]): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (removedTags.length > 0) {
    ops.push(Topic.updateMany({ slug: { $in: removedTags } }, { $inc: { postsCount: -1 } }));
  }
  if (addedTags.length > 0) {
    ops.push(Topic.updateMany({ slug: { $in: addedTags } }, { $inc: { postsCount: 1 } }));
  }
  if (ops.length > 0) await Promise.all(ops);
}

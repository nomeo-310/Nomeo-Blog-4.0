/** Hero is the homepage carousel — it exists to feature blog posts, never external/house creative. */
export const PLACEMENT_OPTIONS = [
  { value: "hero",                label: "Hero (homepage carousel)" },
  { value: "feed_card",           label: "Feed card" },
  { value: "in_article",          label: "In-article" },
  { value: "notification_banner", label: "Notification banner" },
  { value: "modal_popup",         label: "Modal popup" },
] as const;

/**
 * Hero exists to feature an attached blog post, so eligibility is driven by
 * whether a post is attached (postId set) — not the advert's `type` literally.
 * Both "promoted_post" and "creator_promo" adverts carry a postId; "house" and
 * "sponsored" never do, so they're the ones actually excluded from hero.
 */
export function placementOptionsForPost(hasPost: boolean) {
  return hasPost ? PLACEMENT_OPTIONS : PLACEMENT_OPTIONS.filter((o) => o.value !== "hero");
}

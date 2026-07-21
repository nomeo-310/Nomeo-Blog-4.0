import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import type { FullPost } from "./post-types";

/** Back-to-posts link + cover image (with "Featured" badge). */
export function PostHero({ post }: { post: Pick<FullPost, "coverImage" | "isFeatured"> }) {
  return (
    <>
      <div className="pb-2 pt-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" /> Back to posts
        </Link>
      </div>

      {post.coverImage?.secureUrl && (
        <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage.secureUrl} alt="" loading="eager" className="h-full w-full object-cover" />
          {post.isFeatured && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Featured
            </span>
          )}
        </div>
      )}
    </>
  );
}

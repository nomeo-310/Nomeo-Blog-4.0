import Link from "next/link";
import { Eye, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSeries } from "./posts-grid-types";
import { formatDate } from "./posts-grid-format";

/**
 * SeriesCard — single series tile in the dashboard posts grid: cover,
 * published/draft badge, title, description, post count, and a link to
 * view its posts.
 */
export function SeriesCard({ series }: { series: DashboardSeries }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/10 to-primary/5">
        {series.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.coverImage} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/20" />
          </div>
        )}
        <span className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold",
          series.isPublished ? "bg-green-500/90 text-white" : "bg-muted/90 text-muted-foreground backdrop-blur"
        )}>
          {series.isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {series.title}
        </h3>
        {series.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {series.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {series.postsCount} {series.postsCount === 1 ? "post" : "posts"}
          <span className="ml-auto">{formatDate(series.createdAt)}</span>
        </div>

        <div className="mt-auto border-t border-border pt-3 mt-3">
          <Link
            href={`/dashboard/posts?series=${series.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Eye className="h-3.5 w-3.5" /> View posts
          </Link>
        </div>
      </div>
    </article>
  );
}

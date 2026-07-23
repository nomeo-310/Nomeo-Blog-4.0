"use client";

import Modal from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePostDetail } from "../use-post-detail";
import { TimeSeriesChart } from "./time-series-chart";
import { RankedBarList }   from "./ranked-bar-list";
import { formatCompactNumber, formatKobo, formatSecondsAsDuration, titleCase } from "../utils";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ComparisonRow({
  label, value, benchmark, higherIsBetter = true,
}: {
  label: string; value: number; benchmark: number; higherIsBetter?: boolean;
}) {
  const delta = benchmark > 0 ? Math.round(((value - benchmark) / benchmark) * 1000) / 10 : null;
  const isGood = delta === null ? null : higherIsBetter ? delta >= 0 : delta <= 0;

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{formatCompactNumber(value)}</span>
        <span className="text-xs text-muted-foreground">vs {formatCompactNumber(benchmark)} avg</span>
        {delta !== null && (
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
            isGood
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
    </div>
  );
}

export function PostDetailModal({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const { data, isLoading } = usePostDetail(postId);

  return (
    <Modal
      isOpen={!!postId}
      onClose={onClose}
      size="2xl"
      title={data?.post.title ?? (isLoading ? "Loading…" : "Post analytics")}
      description={data ? `by ${data.post.author.name}` : undefined}
    >
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
              {data.post.access}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
              {data.post.status}
            </span>
            {data.post.category && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {data.post.category}
              </span>
            )}
            {data.post.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>

          {/* Engagement snapshot */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-5">
            <StatBlock label="Views" value={formatCompactNumber(data.engagement.views)} />
            <StatBlock label="Likes" value={formatCompactNumber(data.engagement.likes)} />
            <StatBlock label="Comments" value={formatCompactNumber(data.engagement.comments)} />
            <StatBlock label="Saves" value={formatCompactNumber(data.engagement.saves)} />
            <StatBlock label="Open reports" value={data.engagement.pendingReportsCount} />
          </div>

          {/* Reads */}
          <section>
            <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Reading behavior</h3>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatBlock label="Total reads" value={formatCompactNumber(data.reads.totalReads)} />
              <StatBlock label="Unique readers" value={formatCompactNumber(data.reads.uniqueReaders)} />
              <StatBlock label="Completion rate" value={`${data.reads.completionRatePct}%`} />
              <StatBlock label="Avg. read time" value={formatSecondsAsDuration(data.reads.avgReadDurationSecs)} />
            </div>
            {data.reads.readSeries.length > 0 && (
              <TimeSeriesChart data={data.reads.readSeries} height={160} />
            )}
            <div className="mt-4">
              <RankedBarList
                emptyLabel="No reads recorded yet."
                items={[
                  { key: "subscription", label: "Via subscription", value: data.reads.accessMethodBreakdown.subscription },
                  { key: "free_credit",  label: "Via free-read credit", value: data.reads.accessMethodBreakdown.freeCredit },
                  { key: "free_post",    label: "Free post", value: data.reads.accessMethodBreakdown.freePost },
                ]}
              />
            </div>
          </section>

          {/* Benchmark */}
          <section>
            <h3 className="mb-1 font-heading text-sm font-semibold text-foreground">
              Vs. platform average
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Compared to other {data.post.access} posts, last {data.benchmark.sampleWindowDays} days ({data.benchmark.sampleSize} posts sampled)
            </p>
            <div className="divide-y divide-border rounded-xl border border-border px-4">
              <ComparisonRow label="Views"           value={data.engagement.views}    benchmark={data.benchmark.platformAvgViews} />
              <ComparisonRow label="Likes"           value={data.engagement.likes}    benchmark={data.benchmark.platformAvgLikes} />
              <ComparisonRow label="Comments"        value={data.engagement.comments} benchmark={data.benchmark.platformAvgComments} />
              <ComparisonRow label="Completion rate" value={data.reads.completionRatePct} benchmark={data.benchmark.platformAvgCompletionRatePct} />
            </div>
          </section>

          {/* Reactions + comments */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Reactions</h3>
              <RankedBarList
                emptyLabel="No reactions yet."
                items={data.engagement.reactionBreakdown.map((r) => ({
                  key: r.type, label: titleCase(r.type), value: r.count,
                }))}
              />
            </section>
            <section>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Comments</h3>
              <RankedBarList
                emptyLabel="No comments yet."
                items={[
                  { key: "top_level", label: "Top-level", value: data.engagement.commentDepth.topLevel },
                  { key: "replies",   label: "Replies",    value: data.engagement.commentDepth.replies },
                ]}
              />
            </section>
          </div>

          {/* Earnings + co-authors */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Revenue contribution</h3>
              <div className="space-y-2 rounded-xl border border-border p-4">
                <StatBlock label={`Gross earnings across ${data.earnings.periodsCount} billing period${data.earnings.periodsCount === 1 ? "" : "s"}`} value={formatKobo(data.earnings.totalGrossAmount)} />
                <p className="text-xs text-muted-foreground">
                  {Math.round(data.earnings.totalReadMinutes)} weighted subscriber read-minutes
                </p>
              </div>
            </section>
            {data.post.coAuthors.length > 0 && (
              <section>
                <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Co-authors</h3>
                <ul className="space-y-2">
                  {data.post.coAuthors.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="text-foreground">{c.name}</span>
                      <span className="text-xs capitalize text-muted-foreground">{c.role} · {c.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

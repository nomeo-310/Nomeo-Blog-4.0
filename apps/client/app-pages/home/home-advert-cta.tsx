import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Message01Icon } from "@hugeicons/core-free-icons";
import type { HomeLounge } from "./home-types";

/* ── Advert CTA ─────────────────────────────────────────────────────────── */

export function AdvertCTA({ totalPosts, lounges }: { totalPosts: number; lounges: HomeLounge[] }) {
  return (
    <section className="mt-20 px-4 md:px-0">
      <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="flex flex-col justify-between p-8 sm:p-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <HugeiconsIcon icon={Message01Icon} className="h-3 w-3" /> Live now
              </span>
              <h3 className="mt-5 font-heading text-3xl font-bold leading-snug tracking-tight text-foreground sm:text-4xl">
                The conversation doesn&apos;t stop at the last paragraph.
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Lounges are real-time rooms where readers and writers keep talking — open to everyone,
                or members-only for your favourite creators.
              </p>
              {lounges.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-6">
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">{lounges.length}+</p>
                    <p className="text-xs text-muted-foreground">Open lounges</p>
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">
                      {lounges.reduce((s, l) => s + l.membersCount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  {totalPosts > 0 && (
                    <div>
                      <p className="font-heading text-2xl font-bold text-foreground">{totalPosts.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Articles</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/lounges"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Explore lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="border-t border-primary/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Happening right now</p>
            {lounges.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12 text-center">
                <div>
                  <HugeiconsIcon icon={Message01Icon} className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">Lounges opening soon.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lounges.slice(0, 4).map((l) => (
                  <Link key={l.id} href={`/lounges/${l.id}`}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground group-hover:text-primary">{l.name}</p>
                      {l.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{l.description}</p>}
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{l.membersCount.toLocaleString()} members</span>
                        <span>{l.messagesCount.toLocaleString()} messages</span>
                      </div>
                    </div>
                    <HugeiconsIcon icon={ArrowRight02Icon} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                  </Link>
                ))}
                <Link href="/lounges" className="flex w-full items-center justify-center gap-1 pt-2 text-sm font-semibold text-primary hover:underline">
                  See all lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

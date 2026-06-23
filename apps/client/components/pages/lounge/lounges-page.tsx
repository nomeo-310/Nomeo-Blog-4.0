"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { saveRedirectIntent } from "@/lib/redirect-storage";
import { useLounges, type LoungeListItem } from "@/hooks/use-lounges";
import { useRequestJoin } from "@/hooks/use-request-join";
import { useConversationsPanel } from "@/stores/conversations-panel-store";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationWithInfo } from "@/components/ui/pagination";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon, Message01Icon, CircleLock02Icon, Globe02Icon as GlobeIcon, Cancel01Icon, Search01Icon, Mail01Icon, ArrowLeft02Icon, Clock2Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

const PAGE_SIZE = 12;

export default function LoungesPage() {
  const router = useRouter();
  const { open: openMessages } = useConversationsPanel();
  const [rulesFor, setRulesFor]           = useState<LoungeListItem | null>(null);
  const [gatedLounge, setGatedLounge]     = useState<LoungeListItem | null>(null);
  const [searchInput, setSearchInput]     = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage]                   = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    platformLounges, creatorLounges,
    platformTotal, creatorTotal,
    totalItems, totalPages,
    isLoading, isFetching, isError, refetch,
  } = useLounges({ q: debouncedQuery, page, limit: PAGE_SIZE });

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const open = (l: LoungeListItem) => router.push(`/lounges/${l.id}`);
  const hasAnyLounges = platformLounges.length > 0 || creatorLounges.length > 0;

  if (isError) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load lounges.</p>
        <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background pb-20">
      <div className="flex w-full justify-end px-4 pt-5 sm:px-6 lg:px-8">
        <button
          onClick={openMessages}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4 text-primary" />
          Messages
        </button>
      </div>

      <header className="mx-auto max-w-2xl px-4 pt-10 pb-10 text-center md:pt-14 md:pb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Lounges</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Where conversations live.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Real-time spaces to talk, share, and connect — open community rooms
          for everyone, plus members-only lounges run by your favourite writers.
        </p>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl pb-12">
          <div className="flex h-12 w-full items-center gap-2 rounded-full border border-input bg-background px-4 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search lounges by name or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-full w-full bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoungesSkeleton />
        ) : (
          <>
            <div className={cn("transition-opacity", isFetching && "opacity-60")}>
              {platformLounges.length > 0 && (
                <section className="w-full">
                  <div className="mb-5 flex items-center gap-2">
                    <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4 text-primary" />
                    <h2 className="font-heading text-lg font-bold text-foreground">Open to everyone</h2>
                    <span className="ml-2 text-xs text-muted-foreground">({platformTotal})</span>
                  </div>
                  <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {platformLounges.map((l) => (
                      <LoungeCard key={l.id} lounge={l} onOpen={() => open(l)} onRules={() => setRulesFor(l)} onGate={() => {
                        saveRedirectIntent();
                        setGatedLounge(l);
                      }} />
                    ))}
                  </div>
                </section>
              )}

              {creatorLounges.length > 0 && (
                <section className="mt-14 w-full">
                  <div className="mb-5 flex items-center gap-2">
                    <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4 text-primary" />
                    <h2 className="font-heading text-lg font-bold text-foreground">Members-only lounges</h2>
                    <span className="ml-2 text-xs text-muted-foreground">({creatorTotal})</span>
                  </div>
                  <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {creatorLounges.map((l) => (
                      <LoungeCard key={l.id} lounge={l} onOpen={() => open(l)} onRules={() => setRulesFor(l)} onGate={() => {
                        saveRedirectIntent();
                        setGatedLounge(l);
                      }} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {!hasAnyLounges && debouncedQuery && (
              <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
                <HugeiconsIcon icon={Search01Icon} className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No lounges match &quot;{debouncedQuery}&quot;. Try a different search term.
                </p>
              </div>
            )}
            {!hasAnyLounges && !debouncedQuery && (
              <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
                <HugeiconsIcon icon={Message01Icon} className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">No lounges are open yet. Check back soon.</p>
              </div>
            )}

            {hasAnyLounges && totalPages > 1 && (
              <div className="mt-14 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Page <span className="font-semibold text-card-foreground">{page}</span> of{" "}
                  <span className="font-semibold text-card-foreground">{totalPages}</span>
                  <span className="mx-2">·</span>
                  <span className="font-semibold text-card-foreground">{totalItems.toLocaleString()}</span> lounges
                </p>
                <PaginationWithInfo
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  totalItems={totalItems}
                  itemsPerPage={PAGE_SIZE}
                />
              </div>
            )}
          </>
        )}
      </div>

      {rulesFor && <RulesDialog lounge={rulesFor} onClose={() => setRulesFor(null)} />}

      {/* Auth gate — overlays the page so the user can see the lounges behind */}
      {gatedLounge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setGatedLounge(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={CircleLock02Icon} className="h-6 w-6 text-primary" />
            </div>

            <h2 className="font-heading text-xl font-bold text-foreground">
              Sign in to request access
            </h2>
            <p className="mx-auto mt-2.5 text-sm leading-relaxed text-muted-foreground">
              You need an account to request to join{" "}
              <span className="font-semibold text-foreground">{gatedLounge.name}</span>.
              Sign in or create a free account — it only takes a moment.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setGatedLounge(null);
                  // ── Open your login modal here ──────────────────────
                  // e.g. setLoginModalOpen(true)
                  // saveRedirectIntent() was already called when the
                  // gate opened, so after login the user comes back here.
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign in / Create account
              </button>
              <button
                onClick={() => setGatedLounge(null)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
                Back to lounges
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Lounge card ────────────────────────────────────────────────────────── */

function LoungeCard({ lounge, onOpen, onRules, onGate }: {
  lounge: LoungeListItem; onOpen: () => void; onRules: () => void; onGate: () => void;
}) {
  const isOpen = lounge.kind === "platform";
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <button onClick={onOpen} className="relative block h-28 w-full overflow-hidden bg-muted text-left">
        {lounge.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lounge.coverImage.secureUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <HugeiconsIcon icon={Message01Icon} className="h-7 w-7 text-primary/40" />
          </div>
        )}
        <span className={cn(
          "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur",
          isOpen ? "bg-background/80 text-primary" : "bg-background/80 text-foreground"
        )}>
          {isOpen ? <HugeiconsIcon icon={GlobeIcon} className="h-2.5 w-2.5" /> : <HugeiconsIcon icon={CircleLock02Icon} className="h-2.5 w-2.5" />}
          {isOpen ? "Open" : "Members"}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button onClick={onOpen} className="text-left">
          <h3 className="line-clamp-1 font-heading text-base font-bold text-card-foreground group-hover:text-primary">
            {lounge.name}
          </h3>
        </button>
        {lounge.description && (
          <p className="mt-1.5 line-clamp-2 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
            {lounge.description}
          </p>
        )}
        {lounge.creator && (
          <div className="mt-3 flex items-center gap-2">
            {lounge.creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lounge.creator.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {lounge.creator.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              by <span className="font-medium text-foreground">{lounge.creator.displayName}</span>
            </span>
          </div>
        )}
        {!lounge.creator && isOpen && (
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">N</span>
            <span className="text-xs text-muted-foreground">by <span className="font-medium text-foreground">Nomeo</span></span>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={UserMultiple02Icon} className="h-3.5 w-3.5" />{lounge.membersCount.toLocaleString()}</span>
            <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Message01Icon} className="h-3.5 w-3.5" />{lounge.messagesCount.toLocaleString()}</span>
          </div>
          {lounge.rules.length > 0 && (
            <button onClick={onRules} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Rules
            </button>
          )}
        </div>
        {!isOpen && <MembersCta lounge={lounge} onOpen={onOpen} onGate={onGate} />}
      </div>
    </div>
  );
}

/* ── Members-only access CTA ────────────────────────────────────────────── */

function MembersCta({ lounge, onOpen, onGate }: {
  lounge: LoungeListItem; onOpen: () => void; onGate: () => void;
}) {
  const { data: session } = authClient.useSession();
  const { requestJoin, pendingId } = useRequestJoin();
  const sending = pendingId === lounge.id;

  const handleRequestJoin = () => {
    if (!session?.user) { onGate(); return; }
    requestJoin(lounge.id);
  };

  if (lounge.isOwner) {
    return (
      <button onClick={onOpen}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3.5 w-3.5" /> Open your lounge
      </button>
    );
  }
  if (lounge.joinStatus === "approved") {
    return (
      <button onClick={onOpen}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3.5 w-3.5" /> Open lounge
      </button>
    );
  }
  if (lounge.joinStatus === "pending") {
    return (
      <div className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-muted px-2.5 py-2 text-xs font-medium text-muted-foreground">
        <HugeiconsIcon icon={Clock2Icon} className="h-3.5 w-3.5" /> Request pending
      </div>
    );
  }
  return (
    <button onClick={handleRequestJoin} disabled={sending}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60">
      <HugeiconsIcon icon={CircleLock02Icon} className="h-3.5 w-3.5" />
      {sending ? "Sending…" : `Request to join${lounge.creator ? ` · ${lounge.creator.displayName}` : ""}`}
    </button>
  );
}

/* ── Rules dialog ───────────────────────────────────────────────────────── */

function RulesDialog({ lounge, onClose }: { lounge: LoungeListItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-card-foreground">{lounge.name} — house rules</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-accent">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-2.5">
          {lounge.rules.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="leading-relaxed text-muted-foreground">{rule}</span>
            </li>
          ))}
        </ol>
        <button onClick={onClose}
          className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Got it
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */

function LoungesSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border">
            <Skeleton className="h-28 w-full" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
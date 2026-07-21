import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, User03Icon, HashtagIcon, ArrowRight01Icon, ArrowLeft01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/hooks/use-search";
import { ProfileConnectButton } from "@/components/ui/profile-connect-button";
import type { FilterKey } from "./search-types";

/** Error / loading / empty / results-list + preview-panel states for an active search. */
export function SearchResults({
  isError, isFetching, results, query, filter,
  selectedId, mobileShowPreview, activeItem,
  isSignedIn, onItemClick, onNavigate, onBack, onSignIn,
}: {
  isError: boolean;
  isFetching: boolean;
  results: SearchResult[];
  query: string;
  filter: FilterKey;
  selectedId: string | null;
  mobileShowPreview: boolean;
  activeItem: SearchResult | null;
  isSignedIn: boolean;
  onItemClick: (id: string) => void;
  onNavigate: (item: SearchResult) => void;
  onBack: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      {isError ? (
        <div className="p-8 md:p-10 text-center">
          <p className="text-sm font-medium text-foreground">Search is unavailable right now.</p>
          <p className="text-xs text-muted-foreground mt-1">Please try again in a moment.</p>
        </div>
      ) : results.length === 0 && isFetching ? (
        <ResultsSkeleton />
      ) : results.length === 0 ? (
        <div className="p-8 md:p-10 text-center">
          <p className="text-sm font-medium text-foreground">No matches for &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "all"
              ? "Try a tag like 'design' or a writer's name."
              : "Nothing in this filter — try 'All' or another scope."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 h-auto min-h-[300px] max-h-[70vh] md:max-h-[480px] divide-y md:divide-y-0 md:divide-x divide-border relative">

          {/* ── Results list ── */}
          <div className={cn(
            "overflow-y-auto p-2 custom-scrollbar flex flex-col gap-0.5 w-full h-full transition-all duration-300",
            selectedId ? "md:col-span-6" : "md:col-span-12",
            mobileShowPreview ? "hidden md:flex" : "flex"
          )}>
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-3 pt-2 pb-1.5 select-none">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            {results.map(item => {
              const active = selectedId === item.id;
              return (
                <button key={item.id} type="button" onClick={() => onItemClick(item.id)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all group",
                    active ? "md:bg-primary md:text-primary-foreground bg-accent" : "hover:bg-accent text-card-foreground"
                  )}>
                  <div className={cn("p-2 rounded-lg shrink-0 transition-colors",
                    active ? "md:bg-white/15 bg-primary/10 text-primary md:text-inherit" : "bg-muted")}>
                    {getIcon(item.type, active)}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm font-semibold truncate tracking-tight",
                        item.type === "tag" && "font-mono text-xs")}>
                        {item.type === "tag" && "#"}{item.title}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded shrink-0 select-none",
                        active ? "md:bg-white/20 md:text-white bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {item.category}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-0.5 truncate",
                      active ? "md:text-primary-foreground/80 text-muted-foreground" : "text-muted-foreground")}>
                      {item.subtitle}
                    </p>
                  </div>
                  <HugeiconsIcon icon={ArrowRight01Icon}  className={cn(
                    "h-4 w-4 shrink-0 self-center transition-transform",
                    active ? "text-primary md:text-white rotate-90 md:rotate-0" : "text-muted-foreground/40 group-hover:translate-x-0.5"
                  )} />
                </button>
              );
            })}
          </div>

          {/* ── Preview panel ── */}
          {activeItem && (
            <div className={cn(
              "md:col-span-6 bg-muted/20 p-4 md:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full w-full",
              "animate-in fade-in md:slide-in-from-right-2 duration-200",
              mobileShowPreview ? "flex" : "hidden md:flex"
            )}>
              {/* Mobile back */}
              <button type="button" onClick={onBack}
                className="flex md:hidden items-center gap-1 text-xs font-semibold text-primary active:opacity-70">
                <HugeiconsIcon icon={ArrowLeft01Icon}  className="h-4 w-4" /> Back to results
              </button>

              {/* Type badge */}
              <div className="flex items-center gap-2 select-none">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {activeItem.type}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{activeItem.category}</span>
              </div>

              {/* ── Author-specific preview ── */}
              {activeItem.type === "author" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    {activeItem.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeItem.avatar} alt=""
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-border shrink-0" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                        {activeItem.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-base font-bold text-card-foreground truncate">
                        {activeItem.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{activeItem.subtitle}</p>
                    </div>
                  </div>

                  {activeItem.preview && (
                    <p className="text-xs md:text-sm text-card-foreground/90 leading-relaxed">
                      {activeItem.preview}
                    </p>
                  )}

                  <hr className="border-border" />

                  {isSignedIn && activeItem.userId ? (
                    <ProfileConnectButton
                      targetUserId={activeItem.userId}
                      targetIsCreator={activeItem.category === "Creator"}
                      className="w-full justify-center"
                    />
                  ) : !isSignedIn ? (
                    <button type="button" onClick={onSignIn}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                      Sign in to follow
                    </button>
                  ) : null}

                  <button type="button" onClick={() => onNavigate(activeItem)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                    View full profile <HugeiconsIcon icon={ArrowRight01Icon}  className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col flex-1 gap-3">
                  <div>
                    <h3 className="text-base md:text-xl font-heading font-bold text-card-foreground tracking-tight leading-snug">
                      {activeItem.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{activeItem.subtitle}</p>
                  </div>
                  <hr className="border-border" />
                  <p className="text-xs md:text-sm text-card-foreground/90 leading-relaxed whitespace-pre-line flex-1">
                    {activeItem.preview}
                  </p>
                  <button type="button" onClick={() => onNavigate(activeItem)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs md:text-sm font-semibold rounded-lg transition-all">
                    {ctaLabel(activeItem.type)} <HugeiconsIcon icon={ArrowRight01Icon}  className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getIcon(type: string, active: boolean) {
  const cls = cn("h-4 w-4", active ? "text-current" : "text-muted-foreground");
  switch (type) {
    case "story":  return <HugeiconsIcon icon={File01Icon} className={cls} />;
    case "author": return <HugeiconsIcon icon={User03Icon} className={cls} />;
    case "lounge": return <HugeiconsIcon icon={UserMultiple02Icon}    className={cls} />;
    default:       return <HugeiconsIcon icon={HashtagIcon}      className={cls} />;
  }
}

function ctaLabel(type: string) {
  switch (type) {
    case "story":  return "Read full story";
    case "author": return "View profile";
    case "lounge": return "Enter lounge";
    default:       return "Explore topic";
  }
}

/* ── Loading skeleton ───────────────────────────────────────────────────── */

function ResultsSkeleton() {
  return (
    <div className="p-2" aria-busy="true" aria-label="Loading results">
      <div className="px-3 pt-2 pb-1.5">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${55 + ((i * 7) % 30)}%` }} />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${35 + ((i * 5) % 25)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

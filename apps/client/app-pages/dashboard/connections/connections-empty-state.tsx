import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { Tab } from "./connections-types";

/** Empty state for the connections list — differs for "no matches" vs "nothing yet". */
export function EmptyState({ tab, query }: { tab: Tab; query: string }) {
  if (query) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <HugeiconsIcon icon={Search01Icon} className="h-8 w-8 text-muted-foreground/30" />
        <h3 className="mt-4 font-heading text-base font-bold text-foreground">No matches</h3>
        <p className="mt-2 text-sm text-muted-foreground">Try a different name or username.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <HugeiconsIcon icon={UserMultiple02Icon} className="h-8 w-8 text-muted-foreground/30" />
      <h3 className="mt-4 font-heading text-base font-bold text-foreground">
        {tab === "following" ? "Not following anyone yet" : "No followers yet"}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {tab === "following"
          ? "Discover writers and readers on Nomeo and send a follow request."
          : "When people follow you, they'll appear here."}
      </p>
      {tab === "following" && (
        <Link href="/" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Discover people
        </Link>
      )}
    </div>
  );
}

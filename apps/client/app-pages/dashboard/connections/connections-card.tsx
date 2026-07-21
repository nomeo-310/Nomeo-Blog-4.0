import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import type { Connection, Tab } from "./connections-types";

/** A single connection row — avatar, name, bio, and (for "following") a message button. */
export function ConnectionCard({ person, tab, onMessage, messaging }: {
  person: Connection;
  tab: Tab;
  onMessage: () => void;
  messaging: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <Link href={`/profile/${person.username}`} className="shrink-0">
        {person.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/profile/${person.username}`} className="truncate text-sm font-semibold text-foreground hover:text-primary">
            {person.name}
          </Link>
          {person.isCreator && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Creator
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
        {person.bio && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{person.bio}</p>
        )}
      </div>
      {/* Only show message button for people you follow (you're connected both ways if they accepted) */}
      {tab === "following" && (
        <button
          onClick={onMessage}
          disabled={messaging}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          title="Message"
        >
          <HugeiconsIcon icon={Message01Icon} className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

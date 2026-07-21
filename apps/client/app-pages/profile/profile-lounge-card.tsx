import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleLock02Icon, UserMultiple02Icon, Message01Icon } from "@hugeicons/core-free-icons";
import type { ProfileLounge } from "./profile-types";

/** "Members lounge" preview card — creators only. */
export function ProfileLoungeCard({ lounge }: { lounge: ProfileLounge }) {
  if (!lounge) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Members lounge</h2>
      <Link href={`/lounges/${lounge.id}`}
        className="group flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={CircleLock02Icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-foreground group-hover:text-primary">{lounge.name}</p>
          {lounge.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{lounge.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={UserMultiple02Icon} className="h-3 w-3" />{lounge.membersCount.toLocaleString()} members</span>
            <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Message01Icon} className="h-3 w-3" />{lounge.messagesCount.toLocaleString()} messages</span>
          </div>
        </div>
        {lounge.members.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex -space-x-2">
              {lounge.members.slice(0, 5).map((m) => (
                m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.avatar} alt={m.name} title={m.name}
                    className="h-8 w-8 rounded-full border-2 border-card object-cover" />
                ) : (
                  <span key={m.id} title={m.name}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-bold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                )
              ))}
              {lounge.membersCount > 5 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                  +{lounge.membersCount - 5}
                </span>
              )}
            </div>
          </div>
        )}
        <span className="shrink-0 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          Request to join
        </span>
      </Link>
    </div>
  );
}

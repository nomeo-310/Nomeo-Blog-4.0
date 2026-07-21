import { cn } from "@/lib/utils";
import type { LoungeDetail } from "@/hooks/use-lounge";
import type { PresenceMember } from "@/hooks/use-lounge-chat";

/** Right-hand info panel: cover/description, house rules, and who's online now. */
export function LoungeRoomSidebar({ lounge, members, currentUserId, onMemberClick }: {
  lounge: LoungeDetail;
  members: PresenceMember[];
  currentUserId: string;
  onMemberClick: (id: string, name: string) => void;
}) {
  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-background/50">
      <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
        {lounge.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lounge.coverImage.secureUrl} alt="" className="h-20 xl:h-24 w-full rounded object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
            {lounge.name.charAt(0).toUpperCase()}
          </span>
        )}
        <h2 className="mt-2.5 font-heading text-base font-bold text-foreground">{lounge.name}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {lounge.kind === "platform" ? "Open lounge" : "Members-only"} · {lounge.membersCount.toLocaleString()} members
        </p>
      </div>

      {lounge.description && (
        <div className="border-t border-border px-5 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</p>
          <p className="text-xs leading-relaxed text-foreground/80">{lounge.description}</p>
        </div>
      )}

      {/* House Rules Section */}
      {lounge.rules.length > 0 && (
        <div className="border-t border-border bg-accent/10 px-5 py-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">House Rules</p>
          </div>
          <ol className="space-y-2 mt-3">
            {lounge.rules.map((rule, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed text-foreground/80">{rule}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Active Users Listing */}
      <div className="flex-1 border-t border-border px-5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Online now</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
            {members.length}
          </span>
        </div>
        <div className="space-y-0.5">
          {members.map((m) => {
            const isMe = String(m.clientId) === String(currentUserId);
            return (
              <button
                key={m.clientId}
                type="button"
                disabled={isMe}
                onClick={() => !isMe && onMemberClick(m.clientId, m.name ?? "Member")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left",
                  isMe ? "cursor-default" : "hover:bg-accent"
                )}
              >
                <span className="relative">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {(m.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-primary" />
                </span>
                <span className="truncate text-xs font-medium text-foreground">
                  {m.name ?? "Member"}{isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
                </span>
              </button>
            );
          })}
          {members.length === 0 && <p className="px-2 text-xs text-muted-foreground">Just you for now.</p>}
        </div>
      </div>
    </aside>
  );
}

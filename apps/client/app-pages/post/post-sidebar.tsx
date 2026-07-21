import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { getCurrentUser } from "@/lib/session";
import { CommentSection } from "./comment-section";
import type { FullPost, PostAuthor } from "./post-types";

/**
 * Right column: author/co-author bio cards + comments (sticky at top on
 * desktop) when the reader has access, or a "comments hidden" notice
 * behind the paywall.
 */
export function PostSidebar({
  post, canRead, viewer,
}: {
  post: FullPost;
  canRead: boolean;
  viewer: Awaited<ReturnType<typeof getCurrentUser>>;
}) {
  return (
    <div id="comments" className="flex flex-col gap-6 w-full">
      {canRead && (
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4 w-full">
          {/* Author bio — main author gets own card, co-authors share one card */}
          <div className="space-y-4">
            <PersonBioCard
              label="Written by"
              name={post.author.name}
              username={post.author.username}
              avatar={post.author.avatar}
              bio={post.author.bio}
            />
            {post.coAuthors.length > 0 && (
              <CoAuthorsBioCard coAuthors={post.coAuthors} />
            )}
          </div>

          <CommentSection
            postSlug={post.slug}
            isSignedIn={!!viewer}
            currentUserId={viewer?.id}
            currentUserName={viewer?.name ?? undefined}
            currentUserAvatar={viewer?.avatar ?? undefined}
          />
        </div>
      )}

      {!canRead && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Comments are visible once you have access to this post.
          </p>
        </div>
      )}
    </div>
  );
}

function PersonBioCard({
  label, name, username, avatar, bio,
}: {
  label: string; name: string; username: string; avatar: string; bio: string;
}) {
  if (!bio && !username) return null;
  const href = username ? `/profile/${username}` : "#";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-heading text-sm font-bold text-foreground hover:text-primary">
            {name}
          </Link>
          {username && <p className="text-xs text-muted-foreground">@{username}</p>}
          {bio && (
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{bio}</p>
          )}
          <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            More by {name}  <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * CoAuthorsBioCard — all co-authors in a single card.
 * Divider between each co-author, none after the last.
 */
function CoAuthorsBioCard({ coAuthors }: { coAuthors: PostAuthor[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Co-author{coAuthors.length > 1 ? "s" : ""}
      </p>
      <div>
        {coAuthors.map((ca, i) => {
          const href = ca.username ? `/profile/${ca.username}` : "#";
          return (
            <div key={ca.id}>
              <div className="flex items-start gap-3">
                {ca.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ca.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                    {ca.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={href} className="font-heading text-sm font-bold text-foreground hover:text-primary">
                    {ca.name}
                  </Link>
                  {ca.username && <p className="text-xs text-muted-foreground">@{ca.username}</p>}
                  {ca.bio && (
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ca.bio}</p>
                  )}
                  <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    More by {ca.name}  <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {i < coAuthors.length - 1 && (
                <div className="my-4 border-t border-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

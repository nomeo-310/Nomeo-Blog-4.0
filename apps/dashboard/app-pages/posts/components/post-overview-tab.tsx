"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge, AccessBadge } from "./post-badges";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { useModeratePost, useDeletePost } from "../use-post-mutations";
import { formatCompactNumber, formatDateTime, titleCase } from "../utils";
import type { PostDetailResponse } from "../types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PostOverviewTab({
  data, isSuperAdmin, onClose,
}: {
  data: PostDetailResponse;
  isSuperAdmin: boolean;
  onClose: () => void;
}) {
  const { post, recentActions } = data;
  const moderate = useModeratePost(post.id);
  const remove   = useDeletePost(post.id, onClose);

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-1.5">
        <AccessBadge access={post.access} />
        <StatusBadge status={post.status} />
        {post.isFeatured && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Featured
          </span>
        )}
        {post.category && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{post.category}</span>
        )}
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">#{tag}</span>
        ))}
      </div>

      {post.isRemoved && post.removalReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Removed by {post.removedBy?.name ?? "an admin"} on {formatDateTime(post.removedAt)}: {post.removalReason}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-5">
        <StatBlock label="Views" value={formatCompactNumber(post.viewsCount)} />
        <StatBlock label="Likes" value={formatCompactNumber(post.likesCount)} />
        <StatBlock label="Comments" value={formatCompactNumber(post.commentsCount)} />
        <StatBlock label="Saves" value={formatCompactNumber(post.savesCount)} />
        <StatBlock label="Open reports" value={data.pendingReportsCount} />
      </div>

      {/* Author / series */}
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Author</p>
          <p className="font-medium text-foreground">{post.author.name}</p>
          <p className="text-xs text-muted-foreground">{post.author.email}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="font-medium text-foreground">{post.publishedAt ? formatDateTime(post.publishedAt) : "Not published"}</p>
          {post.series && <p className="text-xs text-muted-foreground">Part of series: {post.series.title}</p>}
        </div>
      </div>

      {post.coAuthors.length > 0 && (
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Co-authors</h3>
          <ul className="space-y-2">
            {post.coAuthors.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{c.name}</span>
                <span className="text-xs capitalize text-muted-foreground">{c.role} · {c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Moderation actions */}
      <div>
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Moderation</h3>
        <div className="flex flex-wrap items-start gap-2">
          {!post.isRemoved && (
            <Button
              type="button" size="sm" variant="outline" className={'rounded-full'}
              disabled={moderate.isPending}
              onClick={() => moderate.mutate({ action: post.isFeatured ? "unfeature" : "feature" })}
            >
              {post.isFeatured ? "Unfeature" : "Feature"}
            </Button>
          )}

          {!post.isRemoved && (
            <Select
              value={post.access}
              onValueChange={(access) => moderate.mutate({ action: "set_access", access: access as "free" | "paid" })}
            >
              <SelectTrigger size="sm" className={'w-28'}><SelectValue /></SelectTrigger>
              <SelectContent className={'w-28 p-1'}>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          )}

          {post.isRemoved ? (
            <Button type="button" size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "restore" })}>
              Restore post
            </Button>
          ) : (
            <ReasonActionButton
              label="Remove"
              variant="destructive"
              isLoading={moderate.isPending}
              onConfirm={(reason) => moderate.mutate({ action: "remove", reason })}
            />
          )}
        </div>
      </div>

      {/* Danger zone */}
      {isSuperAdmin && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
          <DeleteConfirmPanel
            confirmValue={post.slug}
            warning="This permanently deletes the post, its comments, reactions, and saved-post bookmarks. This cannot be undone."
            isLoading={remove.isPending}
            onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmSlug: confirmValue })}
          />
        </div>
      )}

      {/* Recent history */}
      {recentActions.length > 0 && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Recent moderation history</h3>
          <ul className="space-y-2">
            {recentActions.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{titleCase(a.action)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">by {a.adminName}{a.reason ? ` — ${a.reason}` : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

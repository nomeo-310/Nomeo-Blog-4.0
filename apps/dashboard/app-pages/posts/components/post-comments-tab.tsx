"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostComments } from "../use-post-detail";
import { useCommentAction } from "../use-post-mutations";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { formatDateTime } from "../utils";

export function PostCommentsTab({ postId }: { postId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePostComments(postId, page);
  const commentAction = useCommentAction(postId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!data?.comments.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No comments on this post yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.comments.map((c) => (
        <div
          key={c.id}
          className={`rounded-xl border p-3 ${c.isRemoved ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {c.author.name}{c.isAuthorReply && <span className="ml-1.5 text-xs text-primary">(post author)</span>}
            </span>
            <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-foreground">{c.isDeletedByAuthor ? "[deleted by author]" : c.body}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{c.likesCount} likes</span>
            <span>{c.repliesCount} replies</span>
            {c.pendingReportsCount > 0 && <span className="text-destructive">{c.pendingReportsCount} open reports</span>}
            {c.parentId && <span>Reply</span>}
          </div>

          <div className="mt-2">
            {c.isRemoved ? (
              <Button
                type="button" size="sm" variant="outline"
                className={'rounded-full'}
                disabled={commentAction.isPending}
                onClick={() => commentAction.mutate({ commentId: c.id, action: "restore" })}
              >
                Restore comment
              </Button>
            ) : (
              <ReasonActionButton
                label="Remove"
                variant="destructive"
                isLoading={commentAction.isPending}
                onConfirm={(reason) => commentAction.mutate({ commentId: c.id, action: "remove", reason })}
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} comments
        </p>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={'rounded-full'}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            className={'rounded-full'}
            type="button" size="icon-sm" variant="outline"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoungeMessages } from "../use-lounge-detail";
import { useLoungeMessageAction } from "../use-lounge-mutations";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { formatDateTime } from "../utils";

export function LoungeMessagesTab({ loungeId }: { loungeId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLoungeMessages(loungeId, page);
  const messageAction = useLoungeMessageAction(loungeId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!data?.messages.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No messages in this lounge yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.messages.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-3 ${m.isRemoved ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {m.author.name}{m.isSystemMessage && <span className="ml-1.5 text-xs text-primary">(system)</span>}
            </span>
            <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-foreground">{m.isDeletedByAuthor ? "[deleted by author]" : m.body}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            {m.isEdited && <span>Edited</span>}
            {Object.keys(m.reactions).length > 0 && (
              <span>{Object.values(m.reactions).reduce((a, b) => a + b, 0)} reactions</span>
            )}
            {m.pendingReportsCount > 0 && <span className="text-destructive">{m.pendingReportsCount} open reports</span>}
            {m.replyToId && <span>Reply</span>}
          </div>

          {!m.isSystemMessage && (
            <div className="mt-2">
              {m.isRemoved ? (
                <Button
                  type="button" size="sm" variant="outline"
                  disabled={messageAction.isPending}
                  onClick={() => messageAction.mutate({ messageId: m.id, action: "restore" })}
                >
                  Restore message
                </Button>
              ) : (
                <ReasonActionButton
                  label="Remove"
                  variant="destructive"
                  isLoading={messageAction.isPending}
                  onConfirm={(reason) => messageAction.mutate({ messageId: m.id, action: "remove", reason })}
                />
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} messages
        </p>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
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

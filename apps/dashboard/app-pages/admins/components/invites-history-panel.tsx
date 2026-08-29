"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvitesList } from "../use-invites-list";
import { AdminRoleBadge } from "./admin-badges";
import { formatDateTime } from "../utils";

export function InvitesHistoryPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useInvitesList({ page, limit: 20 });

  return (
    <div className="space-y-4">
      <div className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !data?.invites.length ? (
          <p className="py-14 text-center text-sm text-muted-foreground">No admins have been added yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.invites.map((invite) => (
              <li key={invite.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Added by {invite.invitedBy.name} · {formatDateTime(invite.createdAt)}</p>
                  </div>
                  <AdminRoleBadge role={invite.role} />
                </div>
                {invite.personalMessage && <p className="mt-2 text-sm text-muted-foreground">&quot;{invite.personalMessage}&quot;</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && !!data?.invites.length && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} added
          </p>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

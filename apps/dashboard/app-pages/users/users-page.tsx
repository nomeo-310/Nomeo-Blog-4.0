"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { useUsersList } from "./use-users-list";
import { useBulkUserAction } from "./use-user-mutations";
import { UsersFilterBar } from "./components/users-filter-bar";
import { UsersTable }     from "./components/users-table";
import { UserDetailModal } from "./components/user-detail-modal";
import { TempBanPanel } from "./components/temp-ban-panel";
import type { UserBanFilter, UserSortBy } from "./types";

export default function UsersPage() {
  const [banStatus, setBanStatus] = useState<UserBanFilter>("all");
  const [sortBy, setSortBy]       = useState<UserSortBy>("newest");
  const [page, setPage]           = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAnAdminOrAbove = role === "admin" || role === "super_admin";

  const bulk = useBulkSelection();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useUsersList({
    banStatus, search, sortBy, page, limit: 20,
  });
  const bulkAction = useBulkUserAction(bulk.clear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review and moderate every reader account on the platform.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <UsersFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        banStatus={banStatus} onBanStatusChange={(v) => { setBanStatus(v); setPage(1); bulk.clear(); }}
        sortBy={sortBy} onSortByChange={(v) => { setSortBy(v); setPage(1); }}
      />

      <BulkActionBar count={bulk.count} onClear={bulk.clear}>
        <ReasonActionButton
          label="Warn" isLoading={bulkAction.isPending}
          onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "warn", reason })}
        />
        <Button
          type="button" size="sm" variant="outline" className="rounded-full"
          disabled={bulkAction.isPending}
          onClick={() => bulkAction.mutate({ ids: bulk.ids, action: "verify_email" })}
        >
          Verify email
        </Button>
        <TempBanPanel
          isLoading={bulkAction.isPending}
          onConfirm={({ reason, banExpiresAt }) => bulkAction.mutate({ ids: bulk.ids, action: "temp_ban", reason, banExpiresAt })}
        />
        <ReasonActionButton
          label="Unban" requireReason={false} isLoading={bulkAction.isPending}
          onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "unban", reason })}
        />
        {isAnAdminOrAbove && (
          <>
            <ReasonActionButton
              label="Permanent ban" variant="destructive" isLoading={bulkAction.isPending}
              onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "permanent_ban", reason })}
            />
            <ReasonActionButton
              label="Shadow ban" isLoading={bulkAction.isPending}
              onConfirm={(reason) => bulkAction.mutate({ ids: bulk.ids, action: "shadow_ban", reason })}
            />
            <DeleteConfirmPanel
              confirmValue="DELETE"
              warning="This permanently deletes each selected account. Their posts and comments remain, attributed to a deleted user. This cannot be undone. Limited to 50 accounts at a time."
              isLoading={bulkAction.isPending}
              onConfirm={({ reason, confirmValue }) => bulkAction.mutate({ ids: bulk.ids, action: "delete", reason, confirmText: confirmValue })}
            />
          </>
        )}
      </BulkActionBar>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <UsersTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onToggleAll={bulk.toggleAll}
          onSelectUser={setSelectedUserId}
          onPageChange={setPage}
        />
      </div>

      <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}

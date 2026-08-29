"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useAdminsList } from "./use-admins-list";
import { AdminsFilterBar } from "./components/admins-filter-bar";
import { AdminsTable }     from "./components/admins-table";
import { AdminDetailModal } from "./components/admin-detail-modal";
import { CreateAdminModal } from "./components/create-admin-modal";
import { InvitesHistoryPanel } from "./components/invites-history-panel";
import type { AdminRoleFilter, AdminStatusFilter } from "./types";

type PageTab = "admins" | "history";

export default function AdminsPage() {
  const [pageTab, setPageTab] = useState<PageTab>("admins");
  const [role, setRole]               = useState<AdminRoleFilter>("all");
  const [adminStatus, setAdminStatus] = useState<AdminStatusFilter>("all");
  const [page, setPage]               = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Opened via the dashboard top bar's "New admin" button (?create=1).
  const [isCreateOpen, setIsCreateOpen] = useState(() => searchParams.get("create") === "1");

  const { data: session } = authClient.useSession();
  const currentRole = (session?.user as { role?: string } | undefined)?.role;
  const canAddAdmin = currentRole === "super_admin";

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Strip the query param once consumed so a refresh/back-nav doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("create") === "1") router.replace("/admins");
  }, [searchParams, router]);

  const { data, isLoading, isFetching, refetch } = useAdminsList({
    role, adminStatus, search, page, limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admins</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage dashboard staff, their roles, and who added them.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
          {canAddAdmin && (
            <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full">
              <Plus className="h-3.5 w-3.5" />
              Add admin
            </Button>
          )}
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "admins",  label: "Admins" },
          { key: "history", label: "History" },
        ] as { key: PageTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setPageTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pageTab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === "admins" ? (
        <>
          <AdminsFilterBar
            search={searchInput} onSearchChange={setSearchInput}
            role={role} onRoleChange={(v) => { setRole(v); setPage(1); }}
            adminStatus={adminStatus} onAdminStatusChange={(v) => { setAdminStatus(v); setPage(1); }}
          />

          <div className="rounded-2xl border border-border bg-card">
            <AdminsTable
              data={data}
              isLoading={isLoading}
              isFetching={isFetching}
              onSelectAdmin={setSelectedAdminId}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <InvitesHistoryPanel />
        </div>
      )}

      <AdminDetailModal adminId={selectedAdminId} onClose={() => setSelectedAdminId(null)} />
      <CreateAdminModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

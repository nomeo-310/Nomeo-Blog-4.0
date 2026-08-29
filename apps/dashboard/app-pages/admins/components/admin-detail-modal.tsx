"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useAdminDetail } from "../use-admin-detail";
import { AdminOverviewTab } from "./admin-overview-tab";
import { AdminPermissionsTab } from "./admin-permissions-tab";

type Tab = "overview" | "permissions";

export function AdminDetailModal({ adminId, onClose }: { adminId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useAdminDetail(adminId);
  const { data: session } = authClient.useSession();
  const currentUser = session?.user as { role?: string; email?: string } | undefined;
  const isSuperAdmin = currentUser?.role === "super_admin";
  // Admin management is hardcoded super_admin-only on the backend — this mirrors that.
  // Session doesn't carry the admin's own Admin._id, so email is the reliable match.
  const isSelf = !!data && data.admin.email === currentUser?.email;

  const handleClose = () => {
    setTab("overview");
    onClose();
  };

  return (
    <Modal
      isOpen={!!adminId}
      onClose={handleClose}
      size="xl"
      title={data?.admin.displayName || data?.admin.name || (isLoading ? "Loading…" : "Admin")}
      description={data ? data.admin.email : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={4} />
      ) : (
        <div>
          {/* Tabs */}
          <div className="mb-5 flex items-center gap-1 border-b border-border">
            {([
              { key: "overview",    label: "Overview" },
              { key: "permissions", label: "Permissions" },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <AdminOverviewTab data={data} isSuperAdmin={isSuperAdmin} isSelf={isSelf} onClose={handleClose} />}
          {tab === "permissions" && (
            <AdminPermissionsTab key={data.admin.id} data={data} canEdit={isSuperAdmin && !isSelf} />
          )}
        </div>
      )}
    </Modal>
  );
}

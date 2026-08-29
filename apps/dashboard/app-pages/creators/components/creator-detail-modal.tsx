"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useCreatorDetail } from "../use-creator-detail";
import { CreatorOverviewTab } from "./creator-overview-tab";
import { CreatorEarningsTab } from "./creator-earnings-tab";

type Tab = "overview" | "earnings";

export function CreatorDetailModal({ creatorId, onClose }: { creatorId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useCreatorDetail(creatorId);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // canRejectCreatorApplication/canApproveCreatorApplication default true for admin+
  // super_admin only; canManagePayouts defaults true for super_admin only. The
  // backend is the real authority — these just decide whether to show the buttons.
  const canModerate = role === "admin" || role === "super_admin";
  const canManagePayouts = role === "super_admin";

  const handleClose = () => {
    setTab("overview");
    onClose();
  };

  return (
    <Modal
      isOpen={!!creatorId}
      onClose={handleClose}
      size="xl"
      title={data?.creator.name ?? (isLoading ? "Loading…" : "Creator")}
      description={data ? `@${data.profile?.username ?? "—"}` : undefined}
      primaryAction={creatorId ? {
        label: "Download summary",
        onClick: () => window.open(`/api/admin/creators/${creatorId}/export`, "_blank"),
      } : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={4} />
      ) : (
        <div>
          {/* Tabs */}
          <div className="mb-5 flex items-center gap-1 border-b border-border">
            {([
              { key: "overview", label: "Overview" },
              { key: "earnings", label: "Earnings" },
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

          {tab === "overview" && <CreatorOverviewTab data={data} canModerate={canModerate} />}
          {tab === "earnings" && <CreatorEarningsTab creatorId={data.creator.id} canManagePayouts={canManagePayouts} />}
        </div>
      )}
    </Modal>
  );
}

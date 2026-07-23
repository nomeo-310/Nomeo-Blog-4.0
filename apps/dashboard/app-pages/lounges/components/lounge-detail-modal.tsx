"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useLoungeDetail } from "../use-lounge-detail";
import { LoungeOverviewTab } from "./lounge-overview-tab";
import { LoungeMessagesTab } from "./lounge-messages-tab";
import { LoungeReportsTab }  from "./lounge-reports-tab";
import { LoungeMembersTab }  from "./lounge-members-tab";

type Tab = "overview" | "messages" | "reports" | "members";

export function LoungeDetailModal({ loungeId, onClose }: { loungeId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useLoungeDetail(loungeId);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // canDeleteLounge defaults true for "admin" and "super_admin" — the backend is
  // the actual authority (permissions are customizable per-admin), this is just
  // a reasonable default to decide whether to show the button at all.
  const canDelete = role === "admin" || role === "super_admin";

  const handleClose = () => {
    setTab("overview");
    onClose();
  };

  return (
    <Modal
      isOpen={!!loungeId}
      onClose={handleClose}
      size="xl"
      title={data?.lounge.name ?? (isLoading ? "Loading…" : "Lounge")}
      description={data ? (data.lounge.creator ? `by ${data.lounge.creator.name}` : "Platform lounge") : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={4} />
      ) : (
        <div>
          {/* Tabs */}
          <div className="mb-5 flex items-center gap-1 border-b border-border">
            {([
              { key: "overview", label: "Overview" },
              { key: "messages", label: "Messages" },
              { key: "reports",  label: "Reports" },
              { key: "members",  label: "Members" },
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

          {tab === "overview" && <LoungeOverviewTab data={data} canDelete={canDelete} onClose={handleClose} />}
          {tab === "messages" && <LoungeMessagesTab loungeId={data.lounge.id} />}
          {tab === "reports"  && <LoungeReportsTab loungeId={data.lounge.id} />}
          {tab === "members"  && <LoungeMembersTab loungeId={data.lounge.id} />}
        </div>
      )}
    </Modal>
  );
}

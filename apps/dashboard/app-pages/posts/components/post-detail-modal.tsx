"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { usePostDetail } from "../use-post-detail";
import { PostOverviewTab } from "./post-overview-tab";
import { PostReportsTab }  from "./post-reports-tab";
import { PostCommentsTab } from "./post-comments-tab";

type Tab = "overview" | "reports" | "comments";

export function PostDetailModal({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = usePostDetail(postId);
  const { data: session } = authClient.useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";

  const handleClose = () => {
    setTab("overview");
    onClose();
  };

  const openReportsCount = data?.reports.filter((r) => !r.reviewed).length ?? 0;

  return (
    <Modal
      isOpen={!!postId}
      onClose={handleClose}
      size="xl"
      title={data?.post.title ?? (isLoading ? "Loading…" : "Post")}
      description={data ? `by ${data.post.author.name}` : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton />
      ) : (
        <div>
          {/* Tabs */}
          <div className="mb-5 flex items-center gap-1 border-b border-border">
            {([
              { key: "overview", label: "Overview" },
              { key: "reports",  label: `Reports${openReportsCount > 0 ? ` (${openReportsCount})` : ""}` },
              { key: "comments", label: "Comments" },
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

          {tab === "overview" && <PostOverviewTab data={data} isSuperAdmin={isSuperAdmin} onClose={handleClose} />}
          {tab === "reports"  && <PostReportsTab postId={data.post.id} reports={data.reports} />}
          {tab === "comments" && <PostCommentsTab postId={data.post.id} />}
        </div>
      )}
    </Modal>
  );
}

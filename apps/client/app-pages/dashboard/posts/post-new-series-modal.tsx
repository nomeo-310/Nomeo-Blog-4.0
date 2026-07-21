"use client";

import Modal from "@/components/ui/modal";

interface NewSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  size: "sm" | "lg";
  newSeriesTitle: string;
  onNewSeriesTitleChange: (value: string) => void;
  newSeriesDesc: string;
  onNewSeriesDescChange: (value: string) => void;
  creatingSeries: boolean;
  onCreate: () => void;
}

/**
 * NewSeriesModal — inline "create a new series" dialog, shared by
 * NewPostPage and EditPostPage.
 *
 * `onClose` (backdrop / X) and `onCancel` (Cancel button) are kept
 * separate because NewPostPage resets the title/description fields on
 * `onClose` but not on `onCancel` — preserved here as-is.
 */
export function NewSeriesModal({
  isOpen, onClose, onCancel, size, newSeriesTitle, onNewSeriesTitleChange,
  newSeriesDesc, onNewSeriesDescChange, creatingSeries, onCreate,
}: NewSeriesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a new series"
      description="Group related posts into an ordered series."
      size={size}
      isLoading={creatingSeries}
      primaryAction={{
        label: creatingSeries ? "Creating…" : "Create series",
        onClick: onCreate,
        loading: creatingSeries,
        disabled: !newSeriesTitle.trim(),
      }}
      secondaryAction={{ label: "Cancel", onClick: onCancel }}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Series title <span className="text-destructive">*</span></label>
          <input value={newSeriesTitle} onChange={(e) => onNewSeriesTitleChange(e.target.value)}
            placeholder="e.g. A Guide to Deep Work"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea value={newSeriesDesc} onChange={(e) => onNewSeriesDescChange(e.target.value)}
            placeholder="What is this series about?"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
        </div>
      </div>
    </Modal>
  );
}

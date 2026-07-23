"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReasonActionButton({
  label, variant = "outline", requireReason = true, isLoading, onConfirm,
}: {
  label: string;
  variant?: "outline" | "destructive" | "default";
  requireReason?: boolean;
  isLoading: boolean;
  onConfirm: (reason?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant={variant} onClick={() => setExpanded(true)} className={'rounded-full'}>
        {label}
      </Button>
    );
  }

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <div className="w-full space-y-2 rounded-xl border border-border p-3">
      <Textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={requireReason ? "Reason (required)…" : "Optional note…"}
        className="min-h-14 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { setExpanded(false); setReason(""); }} disabled={isLoading} className={'rounded-full'}>
          Cancel
        </Button>
        <Button
          className={'rounded-full'}
          type="button" size="sm" variant={variant}
          disabled={!canConfirm || isLoading}
          onClick={() => onConfirm(reason.trim() || undefined)}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Confirm ${label.toLowerCase()}`}
        </Button>
      </div>
    </div>
  );
}

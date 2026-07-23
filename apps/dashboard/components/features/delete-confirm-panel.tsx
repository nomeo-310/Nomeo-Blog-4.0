"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Generic "type the name to confirm" panel for irreversible destructive actions. */
export function DeleteConfirmPanel({
  confirmValue, warning, isLoading, onConfirm,
}: {
  /** The exact value the admin must retype (slug, name, etc.) to enable the confirm button. */
  confirmValue: string;
  warning: string;
  isLoading: boolean;
  onConfirm: (input: { reason: string; confirmValue: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [typedValue, setTypedValue] = useState("");

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="destructive" onClick={() => setExpanded(true)} className={'rounded-full'}>
        Delete permanently
      </Button>
    );
  }

  const canConfirm = reason.trim().length > 0 && typedValue === confirmValue;

  return (
    <div className="w-full space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-2 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{warning}</p>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)…"
        className="min-h-14 text-sm"
      />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Type <span className="font-mono font-semibold text-foreground">{confirmValue}</span> to confirm
        </label>
        <Input value={typedValue} onChange={(e) => setTypedValue(e.target.value)} placeholder={confirmValue} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { setExpanded(false); setReason(""); setTypedValue(""); }} disabled={isLoading} className={'rounded-full'}>
          Cancel
        </Button>
        <Button
          className={'rounded-full'}
          type="button" size="sm" variant="destructive"
          disabled={!canConfirm || isLoading}
          onClick={() => onConfirm({ reason: reason.trim(), confirmValue: typedValue })}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete permanently"}
        </Button>
      </div>
    </div>
  );
}

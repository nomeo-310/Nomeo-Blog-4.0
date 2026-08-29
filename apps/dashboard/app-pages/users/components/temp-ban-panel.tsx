"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";

/** Temporary-ban panel — needs both a reason and an expiry date, so the generic ReasonActionButton doesn't fit. */
export function TempBanPanel({
  isLoading, onConfirm,
}: {
  isLoading: boolean;
  onConfirm: (input: { reason: string; banExpiresAt: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [banExpiresAt, setBanExpiresAt] = useState("");

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setExpanded(true)} className="rounded-full">
        Temp ban
      </Button>
    );
  }

  const canConfirm = reason.trim().length > 0 && !!banExpiresAt;

  return (
    <div className="w-full space-y-2 rounded-xl border border-border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="temp-ban-expires">Ban until</Label>
        <Input id="temp-ban-expires" type="datetime-local" value={banExpiresAt} onChange={(e) => setBanExpiresAt(e.target.value)} />
      </div>
      <Textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)…"
        className="min-h-14 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { setExpanded(false); setReason(""); setBanExpiresAt(""); }} disabled={isLoading} className="rounded-full">
          Cancel
        </Button>
        <Button
          type="button" size="sm" variant="outline" className="rounded-full"
          disabled={!canConfirm || isLoading}
          onClick={() => onConfirm({ reason: reason.trim(), banExpiresAt: new Date(banExpiresAt).toISOString() })}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm temp ban"}
        </Button>
      </div>
    </div>
  );
}

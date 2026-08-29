"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateSmsCampaign } from "../use-sms-campaign-mutations";

/** Parses one "phone, name" or bare "phone" per line into externalRecipients. */
function parseRecipients(raw: string): Array<{ phone: string; name?: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone, name] = line.split(",").map((p) => p.trim());
      return { phone, name: name || undefined };
    })
    .filter((r) => r.phone.length > 0);
}

export function CreateSmsCampaignModal({ isOpen, onClose }: { isOpen: boolean; onClose: (createdId?: string) => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"subscribers" | "external" | "both">("subscribers");
  const [externalRecipientsText, setExternalRecipientsText] = useState("");

  const reset = () => { setTitle(""); setMessage(""); setAudience("subscribers"); setExternalRecipientsText(""); };
  const handleClose = () => { reset(); onClose(); };

  const create = useCreateSmsCampaign((id) => { reset(); onClose(id); });

  const needsExternal = audience === "external" || audience === "both";
  const externalRecipients = parseRecipients(externalRecipientsText);
  const canSubmit = title.trim().length > 0 && message.trim().length > 0 && (!needsExternal || externalRecipients.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    create.mutate({ title: title.trim(), message: message.trim(), audience, externalRecipients });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title="New SMS campaign"
      description="Saved as a draft — nothing sends until you press Send from the campaign detail view."
      primaryAction={{ label: "Create draft", onClick: handleSubmit, disabled: !canSubmit, loading: create.isPending }}
      secondaryAction={{ label: "Cancel", onClick: handleClose, disabled: create.isPending }}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sms-title">Title</Label>
          <Input id="sms-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal name" autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sms-audience">Audience</Label>
          <Select value={audience} onValueChange={(v) => setAudience((v as typeof audience) ?? "subscribers")}>
            <SelectTrigger id="sms-audience" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent className="p-1">
              <SelectItem value="subscribers">Subscribers with a phone number</SelectItem>
              <SelectItem value="external">External numbers only</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="sms-message">Message</Label>
            <span className="text-[11px] text-muted-foreground">{message.length}/918</span>
          </div>
          <Textarea id="sms-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Plain text — no HTML" className="min-h-24 text-sm" maxLength={918} />
        </div>

        {needsExternal && (
          <div className="space-y-1.5">
            <Label htmlFor="sms-external">Phone numbers</Label>
            <Textarea
              id="sms-external" value={externalRecipientsText} onChange={(e) => setExternalRecipientsText(e.target.value)}
              placeholder={"One per line: 08012345678, Name\n+2348012345678"}
              className="min-h-20 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Local (080…) or international format both work — normalized automatically. Format: <code>phone, name</code> — name is optional.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

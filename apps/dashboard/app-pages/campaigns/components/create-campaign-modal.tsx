"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateCampaign } from "../use-campaign-mutations";

/** Parses one "email, name" or bare "email" per line into externalRecipients. */
function parseRecipients(raw: string): Array<{ email: string; name?: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, name] = line.split(",").map((p) => p.trim());
      return { email, name: name || undefined };
    })
    .filter((r) => /^\S+@\S+\.\S+$/.test(r.email));
}

export function CreateCampaignModal({ isOpen, onClose }: { isOpen: boolean; onClose: (createdId?: string) => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"newsletter" | "announcement" | "promotion">("newsletter");
  const [externalRecipientsText, setExternalRecipientsText] = useState("");

  const reset = () => {
    setTitle(""); setSubject(""); setContent(""); setType("newsletter"); setExternalRecipientsText("");
  };
  const handleClose = () => { reset(); onClose(); };

  const create = useCreateCampaign((id) => { reset(); onClose(id); });

  const canSubmit = title.trim().length > 0 && subject.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    create.mutate({
      title: title.trim(),
      subject: subject.trim(),
      content: content.trim(),
      type,
      externalRecipients: parseRecipients(externalRecipientsText),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title="New email campaign"
      description="Saved as a draft — nothing sends until you press Send from the campaign detail view."
      primaryAction={{ label: "Create draft", onClick: handleSubmit, disabled: !canSubmit, loading: create.isPending }}
      secondaryAction={{ label: "Cancel", onClick: handleClose, disabled: create.isPending }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-title">Title</Label>
            <Input id="campaign-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal name" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType((v as typeof type) ?? "newsletter")}>
              <SelectTrigger id="campaign-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-subject">Email subject</Label>
          <Input id="campaign-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Shown in the recipient's inbox" maxLength={150} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-content">Content</Label>
          <Textarea
            id="campaign-content" value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Body of the email — basic HTML is allowed (e.g. <p>, <a>, <strong>)."
            className="min-h-40 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-external">Extra recipients (optional)</Label>
          <Textarea
            id="campaign-external" value={externalRecipientsText} onChange={(e) => setExternalRecipientsText(e.target.value)}
            placeholder={"One per line: email@example.com, Name\nother@example.com"}
            className="min-h-20 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Sent in addition to confirmed newsletter subscribers. Format: <code>email, name</code> — name is optional.
          </p>
        </div>
      </div>
    </Modal>
  );
}

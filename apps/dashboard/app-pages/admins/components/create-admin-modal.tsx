"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateAdmin } from "../use-admin-mutations";
import type { NewAdminCredentials } from "../types";

const DEPARTMENTS = [
  { value: "content",          label: "Content" },
  { value: "trust_and_safety", label: "Trust & safety" },
  { value: "growth",           label: "Growth" },
  { value: "engineering",      label: "Engineering" },
  { value: "support",          label: "Support" },
  { value: "other",            label: "Other" },
];

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">{value}</code>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function CreateAdminModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("other");
  const [role, setRole] = useState("support");
  const [personalMessage, setPersonalMessage] = useState("");
  const [credentials, setCredentials] = useState<NewAdminCredentials | null>(null);

  const reset = () => {
    setEmail(""); setName(""); setDisplayName(""); setDepartment("other");
    setRole("support"); setPersonalMessage(""); setCredentials(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const create = useCreateAdmin(setCredentials);

  const canSubmit = /^\S+@\S+\.\S+$/.test(email.trim()) && name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    create.mutate({
      email: email.trim(),
      name: name.trim(),
      displayName: displayName.trim() || undefined,
      department,
      role,
      personalMessage: personalMessage.trim() || undefined,
    });
  };

  if (credentials) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        title="Admin created"
        description="These credentials were also emailed — but the seed phrase won't be shown again after you close this."
        primaryAction={{ label: "Done", onClick: handleClose }}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {credentials.displayName} ({credentials.email}) can now sign in with the credentials below.
          </p>
          <CredentialRow label="Email" value={credentials.email} />
          <CredentialRow label="Temporary password" value={credentials.tempPassword} />
          <CredentialRow label="Seed phrase" value={credentials.seedPhrase} />
          <p className="text-xs text-muted-foreground">
            They&apos;ll be required to change this password and confirm their seed phrase on first login.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title="Add an admin"
      description="Their account is created immediately — a temp password and seed phrase are emailed to them."
      primaryAction={{ label: "Create admin", onClick: handleSubmit, disabled: !canSubmit, loading: create.isPending }}
      secondaryAction={{ label: "Cancel", onClick: handleClose, disabled: create.isPending }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-name">Full name</Label>
            <Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-display-name">Display name</Label>
            <Input id="admin-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Defaults to full name" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-email">Email</Label>
          <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "support")}>
              <SelectTrigger id="admin-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-department">Department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v ?? "other")}>
              <SelectTrigger id="admin-department" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-message">Personal message</Label>
          <Textarea id="admin-message" value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} placeholder="Optional note included in their invitation email" className="min-h-20 text-sm" maxLength={500} />
        </div>
      </div>
    </Modal>
  );
}

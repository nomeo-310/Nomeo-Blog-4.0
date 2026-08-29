"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image03Icon, SaveIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadImage } from "@/lib/upload-image";
import { useMe } from "./use-me";
import { useUpdateMe } from "./use-update-me";

const AVATAR_UPLOAD_PRESET = "nomeo_blogs_profile";

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AccountPage() {
  const { data: me, isLoading } = useMe();
  const update = useUpdateMe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [syncedFor, setSyncedFor] = useState<string | null>(null);

  if (me && syncedFor !== me.adminId) {
    setDisplayName(me.displayName);
    setSyncedFor(me.adminId);
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage({ file, uploadPreset: AVATAR_UPLOAD_PRESET });
      update.mutate({ avatar: result.secure_url });
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !me) {
    return (
      <div className="max-w-xl space-y-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    );
  }

  const nameChanged = displayName.trim() !== me.displayName && displayName.trim().length > 0;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My account</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Update your photo and how your name appears across the dashboard.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="relative h-16 w-16 shrink-0">
          {me.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {me.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">JPG or PNG, shown across the admin dashboard.</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <HugeiconsIcon icon={Image03Icon} className="h-3.5 w-3.5" />
            {me.avatar ? "Change photo" : "Add photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Basic info */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="account-display-name">Display name</Label>
          <Input id="account-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
          <p className="text-xs text-muted-foreground">Shown in the sidebar, audit log, and to other admins.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{me.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <p className="text-sm text-muted-foreground">{me.name}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground">{titleCase(me.role)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <p className="text-sm text-muted-foreground">{titleCase(me.department)}</p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button" size="sm" className="rounded-full"
            disabled={!nameChanged || update.isPending}
            onClick={() => update.mutate({ displayName: displayName.trim() })}
          >
            {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-3.5 w-3.5" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

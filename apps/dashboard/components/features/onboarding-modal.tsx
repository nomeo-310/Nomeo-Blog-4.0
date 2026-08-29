"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/upload-image";
import { useCompleteOnboarding } from "@/hooks/use-complete-onboarding";

const AVATAR_UPLOAD_PRESET = "nomeo_blogs_profile";

/**
 * Mandatory first-login setup — shown whenever the signed-in admin's session
 * reports isOnboarded: false. Cannot be dismissed: no close button, no
 * outside-click, no escape. The seed phrase is untouched here (never
 * regenerated during onboarding) — only the password, name, and avatar.
 */
export function OnboardingModal({ isOpen, currentDisplayName }: { isOpen: boolean; currentDisplayName: string }) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const complete = useCompleteOnboarding(() => {
    // Full reload so the session is re-fetched with isOnboarded: true and
    // every /api/admin/* call (blocked until now) starts working.
    window.location.reload();
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage({ file, uploadPreset: AVATAR_UPLOAD_PRESET });
      setAvatar(result.secure_url);
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const canSubmit =
    displayName.trim().length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !isUploading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    complete.mutate({
      newPassword,
      confirmPassword,
      displayName: displayName.trim(),
      avatar: avatar ?? undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      closeOnOutsideClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      size="lg"
      title="Welcome — let's finish setting up your account"
      description="This is required before you can use the dashboard. Your seed phrase stays the same — you won't need to save a new one."
      primaryAction={{ label: "Complete setup", onClick: handleSubmit, disabled: !canSubmit, loading: complete.isPending }}
    >
      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
          <div className="relative h-14 w-14 shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {displayName.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              <HugeiconsIcon icon={Image03Icon} className="h-3.5 w-3.5" />
              Add photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-display-name">Display name</Label>
          <Input id="onboarding-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-new-password">New password</Label>
          <div className="relative">
            <Input
              id="onboarding-new-password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-confirm-password">Confirm password</Label>
          <Input
            id="onboarding-confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
          />
          {confirmPassword.length > 0 && confirmPassword !== newPassword && (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This replaces the temporary password you were emailed. Your seed phrase is unchanged — keep using the one from your invite email.
        </p>
      </div>
    </Modal>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, Cancel01Icon, Add01Icon, AlertCircleIcon, CircleLock02Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import ImageCropper from "@/components/auth/image-cropper";
import { deleteImage } from "@/lib/delete-images";
import { Loader2 } from "lucide-react";

const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";

type CoverImage = { url: string; publicId: string } | null;

export default function NewLoungePage() {
  const router = useRouter();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage]   = useState<CoverImage>(null);
  const [cropFile, setCropFile]       = useState<File | null>(null);
  const [rules, setRules]             = useState<string[]>([""]);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Cover image helpers ──────────────────────────────────────────────
  // Delete from Cloudinary then clear local state.
  // Optimistic — clears UI immediately; failure is non-blocking.
  const removeCoverImage = async () => {
    if (!coverImage) return;
    const { publicId } = coverImage;
    setCoverImage(null);
    try {
      await deleteImage(publicId);
    } catch {
      console.warn("[NewLoungePage] Cloudinary delete failed for", publicId);
    }
  };

  // ── Rule helpers ─────────────────────────────────────────────────────
  const addRule = () => {
    if (rules.length >= 20) return;
    setRules((r) => [...r, ""]);
  };
  const updateRule = (i: number, val: string) => {
    setRules((r) => r.map((x, idx) => (idx === i ? val : x)));
  };
  const removeRule = (i: number) => {
    setRules((r) => r.filter((_, idx) => idx !== i));
  };

  // ── Validation ───────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Lounge name is required.";
    if (name.trim().length > 100) e.name = "Name must be 100 characters or less.";
    if (description.trim().length > 500) e.description = "Description must be 500 characters or less.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanRules = rules.map((r) => r.trim()).filter(Boolean);
      await api.post("/api/lounges", {
        name: name.trim(),
        description: description.trim(),
        // Send full object so the route can store both secureUrl + publicId
        coverImage: coverImage
          ? { secureUrl: coverImage.url, publicId: coverImage.publicId }
          : null,
        rules: cleanRules,
      });
      toast.success("Lounge created! Share it with your audience.");
      router.push("/dashboard/lounges");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Couldn't create lounge. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Create a lounge</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A members-only room where your subscribers can talk with you and each other.
        </p>
      </div>

      {/* What is a lounge */}
      <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <HugeiconsIcon icon={Message01Icon} className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Your lounge, your room.</span> Only people
          you approve can join. They can message in real-time, and you can pin announcements,
          set house rules, and build a community around your writing.
        </div>
      </div>

      {/* Cover image */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Cover image</p>
        {cropFile ? (
          <ImageCropper
            file={cropFile}
            aspect={16 / 9}
            cropShape="rect"
            uploadPreset={CLOUDINARY_PRESET_COVER}
            onCancel={() => setCropFile(null)}
            onUploaded={(img) => { setCoverImage(img); setCropFile(null); }}
          />
        ) : coverImage ? (
          <div className="group relative aspect-video overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
            {/* Remove: delete from Cloudinary + clear state */}
            <button
              onClick={removeCoverImage}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <HugeiconsIcon icon={ImageAdd01Icon} className="h-8 w-8" />
            <span className="text-sm font-medium">Upload a cover image</span>
            <span className="text-xs">Shows on the lounges discovery page</span>
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              // If replacing an existing image, delete the old one first
              if (coverImage) await removeCoverImage();
              setCropFile(file);
            }
            e.target.value = "";
          }}
        />
      </div>

      {/* Name */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Lounge name <span className="text-destructive">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Writers Room"
          maxLength={100}
          className={cn(
            "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
            errors.name
              ? "border-destructive"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
        {errors.name && <FieldError msg={errors.name} />}
        <p className="mt-1 text-right text-xs text-muted-foreground">{name.length}/100</p>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will people talk about in this lounge?"
          rows={3}
          maxLength={500}
          className={cn(
            "w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
            errors.description
              ? "border-destructive"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
        {errors.description && <FieldError msg={errors.description} />}
        <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/500</p>
      </div>

      {/* House rules */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            House rules{" "}
            <span className="font-normal text-muted-foreground">
              ({rules.filter(Boolean).length}/20)
            </span>
          </p>
          <button
            onClick={addRule}
            disabled={rules.length >= 20}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5" /> Add rule
          </button>
        </div>
        <div className="space-y-2.5">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <input
                value={rule}
                onChange={(e) => updateRule(i, e.target.value)}
                placeholder={`Rule ${i + 1}…`}
                maxLength={200}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => removeRule(i)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                aria-label="Remove rule"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No rules yet. Add some to set expectations for your lounge.
          </p>
        )}
      </div>

      {/* Access info */}
      <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
        <HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Members only</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Anyone can discover this lounge, but only people you approve can join and
            chat. You&apos;ll get a notification for each join request.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => router.back()}
          className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={Message01Icon} className="h-4 w-4" />}
          {saving ? "Creating…" : "Create lounge"}
        </button>
      </div>

    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <HugeiconsIcon icon={AlertCircleIcon} className="h-3.5 w-3.5" />{msg}
    </p>
  );
}
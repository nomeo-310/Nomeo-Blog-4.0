"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { deleteImage } from "@/lib/delete-images";
import { Loader2 } from "lucide-react";
import { LoungeCoverImageField } from "./lounge-cover-image-field";
import { LoungeNameField, LoungeDescriptionField, LoungeRulesField } from "./lounge-form-fields";
import { LoungeAccessInfo } from "./lounge-access-info";
import type { CoverImage } from "./lounge-types";

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

      <LoungeCoverImageField
        coverImage={coverImage}
        cropFile={cropFile}
        onCropCancel={() => setCropFile(null)}
        onCropUploaded={(img) => { setCoverImage(img); setCropFile(null); }}
        onRemove={removeCoverImage}
        inputRef={coverInputRef}
        onFileChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            // If replacing an existing image, delete the old one first
            if (coverImage) await removeCoverImage();
            setCropFile(file);
          }
          e.target.value = "";
        }}
      />

      <LoungeNameField name={name} onChange={setName} error={errors.name} />

      <LoungeDescriptionField description={description} onChange={setDescription} error={errors.description} />

      <LoungeRulesField rules={rules} onAdd={addRule} onUpdate={updateRule} onRemove={removeRule} />

      <LoungeAccessInfo
        note={<>Anyone can discover this lounge, but only people you approve can join and
          chat. You&apos;ll get a notification for each join request.</>}
      />

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

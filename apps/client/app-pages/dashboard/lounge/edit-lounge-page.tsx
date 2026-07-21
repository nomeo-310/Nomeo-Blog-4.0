"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, SaveIcon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { deleteImage } from "@/lib/delete-images";
import { LoungeCoverImageField } from "./lounge-cover-image-field";
import { LoungeNameField, LoungeDescriptionField, LoungeRulesField } from "./lounge-form-fields";
import { LoungeAccessInfo } from "./lounge-access-info";
import type { CoverImage } from "./lounge-types";

/**
 * EditLoungePage — edit an existing creator lounge.
 *
 * Uses React Query:
 *   useQuery(["lounge", id])  → GET /api/lounges/[id]  (prefill)
 *   useMutation               → PATCH /api/lounges/[id] (save)
 *
 * Layout is composed from sibling sub-components shared with new-lounge-page
 * (lounge-cover-image-field, lounge-form-fields, lounge-access-info); this
 * file owns the data layer and top-level composition only.
 *
 * Route: app/dashboard/lounges/[id]/edit/page.tsx
 */

async function fetchLounge(id: string) {
  const { data } = await api.get(`/api/lounges/${id}`);
  return data?.lounge;
}

export default function EditLoungePage() {
  const router   = useRouter();
  const params   = useParams<{ id: string }>();
  const loungeId = params.id;
  const qc       = useQueryClient();

  // ── React Query: fetch lounge ─────────────────────────────────────
  const { data: lounge, isLoading, isError } = useQuery({
    queryKey: ["lounge", loungeId],
    queryFn:  () => fetchLounge(loungeId),
    staleTime: 60_000,
  });

  console.log(lounge)

  // ── Local form state — initialised once from query data ───────────
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [coverImage,  setCoverImage]  = useState<CoverImage>(null);
  const [cropFile,    setCropFile]    = useState<File | null>(null);
  const [rules,       setRules]       = useState<string[]>([""]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [initialised, setInitialised] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Prefill when data arrives — runs synchronously during render
  // so no flash of empty fields
  if (lounge && !initialised) {
    setName(lounge.name ?? "");
    setDescription(lounge.description ?? "");
    setRules(lounge.rules?.length ? lounge.rules : [""]);
    if (lounge.coverImage?.secureUrl) {
      setCoverImage({ url: lounge.coverImage.secureUrl, publicId: lounge.coverImage.publicId ?? "" });
    }
    setInitialised(true);
  }

  // ── Cover image helpers ───────────────────────────────────────────
  const removeCoverImage = async () => {
    if (!coverImage) return;
    const old = coverImage;
    setCoverImage(null);
    try { await deleteImage(old.publicId); } catch {}
  };

  // ── Rule helpers ──────────────────────────────────────────────────
  const addRule    = () => { if (rules.length < 20) setRules(r => [...r, ""]); };
  const updateRule = (i: number, val: string) => setRules(r => r.map((x, idx) => idx === i ? val : x));
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));

  // ── Validation ────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())              e.name = "Lounge name is required.";
    if (name.trim().length > 100)  e.name = "Name must be 100 characters or less.";
    if (description.trim().length > 500) e.description = "Description must be 500 characters or less.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── React Query: mutation for saving ─────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch(`/api/lounges/${loungeId}`, {
      name:        name.trim(),
      description: description.trim(),
      coverImage:  coverImage ? { url: coverImage.url, publicId: coverImage.publicId } : null,
      rules:       rules.map(r => r.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      toast.success("Lounge updated.");
      qc.invalidateQueries({ queryKey: ["lounge", loungeId] });
      router.push("/dashboard/lounges");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Couldn't save. Try again.");
    },
  });

  const submit = () => { if (validate()) save(); };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-muted" />
        <div className="h-48 rounded-2xl bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center">
        <HugeiconsIcon icon={AlertCircleIcon} className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-foreground">Couldn't load this lounge.</p>
        <p className="text-sm text-muted-foreground">Go back and try again.</p>
        <button onClick={() => router.back()}
          className="mt-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-accent">
          Go back
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Edit lounge</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes are visible to members immediately after saving.
          </p>
        </div>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <LoungeCoverImageField
        coverImage={coverImage}
        cropFile={cropFile}
        onCropCancel={() => setCropFile(null)}
        onCropUploaded={(img) => { setCoverImage(img); setCropFile(null); }}
        onRemove={removeCoverImage}
        onReplace={async () => { await removeCoverImage(); coverInputRef.current?.click(); }}
        inputRef={coverInputRef}
        onFileChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) { if (coverImage) await removeCoverImage(); setCropFile(file); }
          e.target.value = "";
        }}
      />

      <LoungeNameField name={name} onChange={setName} error={errors.name} />

      <LoungeDescriptionField description={description} onChange={setDescription} error={errors.description} />

      <LoungeRulesField rules={rules} onAdd={addRule} onUpdate={updateRule} onRemove={removeRule} />

      <LoungeAccessInfo
        note={<>Anyone can discover this lounge, but only people you approve can join and chat.
          Access type can't be changed after creation.</>}
      />

      {/* Bottom actions */}
      <div className="flex gap-3 pb-4">
        <button onClick={() => router.back()}
          className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent">
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

    </div>
  );
}

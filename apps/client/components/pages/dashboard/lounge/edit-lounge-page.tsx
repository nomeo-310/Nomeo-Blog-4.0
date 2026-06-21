"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Image, X, Plus, Loader2, AlertCircle,
  Lock, Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import ImageCropper from "@/components/auth/image-cropper";
import { deleteImage } from "@/lib/delete-images";

/**
 * EditLoungePage — edit an existing creator lounge.
 *
 * Uses React Query:
 *   useQuery(["lounge", id])  → GET /api/lounges/[id]  (prefill)
 *   useMutation               → PATCH /api/lounges/[id] (save)
 *
 * Route: app/dashboard/lounges/[id]/edit/page.tsx
 */

const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";

type CoverImage = { url: string; publicId: string } | null;

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
        <AlertCircle className="h-8 w-8 text-destructive" />
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
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
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={async () => { await removeCoverImage(); coverInputRef.current?.click(); }}
                className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"
              >
                Replace
              </button>
              <button onClick={removeCoverImage}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => coverInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            <Image className="h-8 w-8" />
            <span className="text-sm font-medium">Upload a cover image</span>
            <span className="text-xs">Shows on the lounges discovery page</span>
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) { if (coverImage) await removeCoverImage(); setCropFile(file); }
            e.target.value = "";
          }} />
      </div>

      {/* Name */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Lounge name <span className="text-destructive">*</span>
        </label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. The Writers Room" maxLength={100}
          className={cn("w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
            errors.name ? "border-destructive" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
        {errors.name && <FieldError msg={errors.name} />}
        <p className="mt-1 text-right text-xs text-muted-foreground">{name.length}/100</p>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="What will people talk about in this lounge?"
          rows={3} maxLength={500}
          className={cn("w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
            errors.description ? "border-destructive" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
        {errors.description && <FieldError msg={errors.description} />}
        <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/500</p>
      </div>

      {/* House rules */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            House rules{" "}
            <span className="font-normal text-muted-foreground">({rules.filter(Boolean).length}/20)</span>
          </p>
          <button onClick={addRule} disabled={rules.length >= 20}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" /> Add rule
          </button>
        </div>
        <div className="space-y-2.5">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <input value={rule} onChange={e => updateRule(i, e.target.value)}
                placeholder={`Rule ${i + 1}…`} maxLength={200}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <button onClick={() => removeRule(i)} aria-label="Remove rule"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground">No rules yet. Add some to set expectations for your lounge.</p>
        )}
      </div>

      {/* Access info */}
      <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Members only</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Anyone can discover this lounge, but only people you approve can join and chat.
            Access type can't be changed after creation.
          </p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex gap-3 pb-4">
        <button onClick={() => router.back()}
          className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent">
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5" />{msg}
    </p>
  );
}
"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SaveIcon, Image03Icon, Cancel01Icon, Sparkles, Tick02Icon, Briefcase07Icon, Location01Icon, Globe02Icon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImageCropper from "@/components/auth/image-cropper";
import { deleteImage } from "@/lib/delete-images";
import BioBuilderDialog from "@/components/auth/bio-builder-dialog";
import { Field, inputCls } from "./settings-field";
import { SettingsSkeleton } from "./settings-skeleton";
import { fetchProfile } from "./settings-format";

const CLOUDINARY_PRESET_AVATAR = "nomeo_blogs_profile";
const CLOUDINARY_PRESET_COVER  = "nomeo_blogs_cover";

/** Profile tab — basic info, bio, social links, avatar/cover upload, with a live preview. */
export function ProfileSettings() {
  const { data: session } = authClient.useSession();
  const qc = useQueryClient();

  const { data: profile, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["profile"],
    queryFn:  fetchProfile,
    staleTime: 60_000,
  });

  const [avatar, setAvatar]         = useState<{ url: string; publicId: string } | null>(null);
  const [cover,  setCover]          = useState<{ url: string; publicId: string } | null>(null);
  const [cropFile, setCropFile]     = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "cover" | null>(null);
  const [bioOpen, setBioOpen]       = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const lastSyncedAt = useRef(0);
  if (profile && dataUpdatedAt !== lastSyncedAt.current) {
    lastSyncedAt.current = dataUpdatedAt;

    setAvatar(
      profile.avatar
        ? { url: profile.avatar, publicId: profile.avatarPublicId ?? "" }
        : null
    );
    setCover(
      profile.coverImage?.secureUrl || profile.coverImage?.url
        ? { url: profile.coverImage.secureUrl || profile.coverImage.url, publicId: profile.coverImage.publicId ?? "" }
        : null
    );
  }

  const [form, setForm] = useState({
    displayName: "", pronouns: "", bio: "", about: "",
    location: "", occupation: "",
    website: "", twitter: "", linkedin: "", github: "", instagram: "",
  });
  const lastFormSyncedAt = useRef(0);
  if (profile && dataUpdatedAt !== lastFormSyncedAt.current) {
    lastFormSyncedAt.current = dataUpdatedAt;
    setForm({
      displayName: profile.displayName ?? "",
      pronouns:    profile.pronouns    ?? "",
      bio:         profile.bio         ?? "",
      about:       profile.about       ?? "",
      location:    profile.location    ?? "",
      occupation:  profile.occupation  ?? "",
      website:     profile.socialLinks?.website   ?? "",
      twitter:     profile.socialLinks?.twitter   ?? "",
      linkedin:    profile.socialLinks?.linkedin  ?? "",
      github:      profile.socialLinks?.github    ?? "",
      instagram:   profile.socialLinks?.instagram ?? "",
    });
  }

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch("/api/profile", {
      displayName: form.displayName.trim(),
      pronouns:    form.pronouns.trim(),
      bio:         form.bio.trim(),
      about:       form.about.trim(),
      location:    form.location.trim(),
      occupation:  form.occupation.trim(),
      socialLinks: {
        website:   form.website.trim(),
        twitter:   form.twitter.trim(),
        linkedin:  form.linkedin.trim(),
        github:    form.github.trim(),
        instagram: form.instagram.trim(),
      },
      ...(avatar ? { profileImage: { url: avatar.url, publicId: avatar.publicId } } : {}),
      ...(cover  ? { coverImage:   { url: cover.url,  publicId: cover.publicId  } } : {}),
    }),
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Couldn't save. Try again."),
  });

  const removeAvatar = async () => {
    if (!avatar) return;
    const old = avatar; setAvatar(null);
    try { await deleteImage(old.publicId); } catch {}
  };

  const removeCover = async () => {
    if (!cover) return;
    const old = cover; setCover(null);
    try { await deleteImage(old.publicId); } catch {}
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">

      {/* ── LEFT ─────────────────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Cover + avatar hero */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {cropFile && (
            <div className="p-4">
              <ImageCropper
                file={cropFile}
                aspect={cropTarget === "cover" ? 16 / 5 : 1}
                cropShape={cropTarget === "cover" ? "rect" : "round"}
                uploadPreset={cropTarget === "cover" ? CLOUDINARY_PRESET_COVER : CLOUDINARY_PRESET_AVATAR}
                onCancel={() => { setCropFile(null); setCropTarget(null); }}
                onUploaded={(img) => {
                  if (cropTarget === "cover") setCover(img); else setAvatar(img);
                  setCropFile(null); setCropTarget(null);
                }}
              />
            </div>
          )}

          {!cropFile && (
            <>
              <div className="group relative w-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted"
                style={{ aspectRatio: "16/5" }}>
                {cover?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => { setCropTarget("cover"); coverInputRef.current?.click(); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/30">
                    <HugeiconsIcon icon={Image03Icon} className="h-3.5 w-3.5" />{cover ? "Change cover" : "Add cover"}
                  </button>
                  {cover && (
                    <button onClick={removeCover} aria-label="Remove cover"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
                      <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative px-5 pb-4">
                <div className="absolute -top-10 left-5 h-20 w-20">
                  {avatar?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar.url} alt="" className="h-20 w-20 rounded-full border-4 border-card object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary/10 text-2xl font-bold text-primary">
                      {form.displayName?.charAt(0)?.toUpperCase() || session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                  <button onClick={() => { setCropTarget("avatar"); fileInputRef.current?.click(); }}
                    aria-label="Change avatar"
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow transition-transform hover:scale-110">
                    <HugeiconsIcon icon={Image03Icon} className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="h-12" />
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span><span className="font-medium text-foreground">Profile photo:</span> JPG or PNG, cropped to circle</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span><span className="font-medium text-foreground">Cover image:</span> Hover the banner to edit</span>
                </div>
              </div>
            </>
          )}

          <input ref={fileInputRef}  type="file" accept="image/*" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setCropTarget("avatar"); setCropFile(file); } e.target.value = ""; }} />
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setCropTarget("cover");  setCropFile(file); } e.target.value = ""; }} />
        </div>

        {/* Basic info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Basic info</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name"><input value={form.displayName} onChange={f("displayName")} className={inputCls} placeholder="Your name" maxLength={100} /></Field>
            <Field label="Pronouns"><input value={form.pronouns} onChange={f("pronouns")} className={inputCls} placeholder="e.g. she/her" maxLength={30} /></Field>
            <Field label="Location"><input value={form.location} onChange={f("location")} className={inputCls} placeholder="Lagos, Nigeria" maxLength={100} /></Field>
            <Field label="Occupation"><input value={form.occupation} onChange={f("occupation")} className={inputCls} placeholder="Writer" maxLength={100} /></Field>
          </div>
        </div>

        {/* Bio */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Bio</p>
            <button onClick={() => setBioOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
              <HugeiconsIcon icon={Sparkles} className="h-3.5 w-3.5" /> Help me write it
            </button>
          </div>
          <Field label="Short bio" hint="Shown on your profile card and post author section (max 500 chars)">
            <textarea value={form.bio} onChange={f("bio")} rows={5} maxLength={500}
              className={cn(inputCls, "resize-none")} placeholder="A short bio…" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.bio.length}/500</p>
          </Field>
          <Field label="About" hint="Longer description shown on your full profile page (max 5000 chars)">
            <textarea value={form.about} onChange={f("about")} rows={5} maxLength={5000}
              className={cn(inputCls, "resize-none")} placeholder="Tell readers more about yourself…" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.about.length}/5000</p>
          </Field>
        </div>

        {/* Social links */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Social links</p>
          <Field label="Website"><input value={form.website} onChange={f("website")} className={inputCls} placeholder="https://yoursite.com" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Twitter / X"><input value={form.twitter}   onChange={f("twitter")}   className={inputCls} placeholder="@handle" /></Field>
            <Field label="LinkedIn">  <input value={form.linkedin}  onChange={f("linkedin")}  className={inputCls} placeholder="linkedin.com/in/you" /></Field>
            <Field label="GitHub">    <input value={form.github}    onChange={f("github")}    className={inputCls} placeholder="username" /></Field>
            <Field label="Instagram"> <input value={form.instagram} onChange={f("instagram")} className={inputCls} placeholder="@handle" /></Field>
          </div>
        </div>

        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* ── RIGHT: live preview ──────────────────────────────────────── */}
      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 overflow-hidden">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile preview</p>
          <div className="flex flex-col items-center text-center min-w-0">
            {avatar?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {form.displayName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
            <h3 className="mt-3 font-heading text-base font-bold text-foreground w-full truncate">{form.displayName || "Your name"}</h3>
            {form.pronouns   && <p className="text-xs text-muted-foreground w-full truncate">{form.pronouns}</p>}
            {form.occupation && <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground max-w-full"><HugeiconsIcon icon={Briefcase07Icon} className="h-3 w-3 shrink-0" /><span className="truncate">{form.occupation}</span></p>}
            {form.location   && <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground max-w-full"><HugeiconsIcon icon={Location01Icon} className="h-3 w-3 shrink-0" /><span className="truncate">{form.location}</span></p>}
            {form.bio && (
              <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground w-full break-words text-left">
                {form.bio}
              </p>
            )}
            {(form.website || form.twitter || form.github) && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 w-full">
                {form.website && <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground"><HugeiconsIcon icon={Globe02Icon} className="h-3 w-3" />Website</span>}
                {form.twitter && <span className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">Twitter</span>}
                {form.github  && <span className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">GitHub</span>}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Tips</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {[
              "A clear photo helps others recognise you.",
              profile?.role === "creator"
                ? "Your short bio appears on every post you write."
                : "Your short bio is shown on your public profile.",
              "Use the \"About\" section to tell a fuller story.",
              "Social links help people find you elsewhere.",
            ].map(tip => (
              <li key={tip} className="flex items-start gap-1.5">
                <HugeiconsIcon icon={Tick02Icon} className="h-3 w-3 mt-0.5 shrink-0 text-primary" />{tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <BioBuilderDialog
        open={bioOpen}
        onClose={() => setBioOpen(false)}
        onPick={(bio) => setForm(p => ({ ...p, bio }))}
        defaults={{ occupation: form.occupation || undefined }}
      />
    </div>
  );
}

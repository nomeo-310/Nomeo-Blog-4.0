"use client";

import { useState, useRef, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Camera, Loader2, AlertTriangle, Eye, EyeOff,
  Check, X, Sparkles, Shield, Bell, Palette, User,
  MapPin, Briefcase, Globe, Lock, PenLine, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImageCropper from "@/components/auth/image-cropper";
import { deleteImage } from "@/lib/delete-images";
import BioBuilderDialog from "@/components/auth/bio-builder-dialog";

const CLOUDINARY_PRESET_AVATAR = "nomeo_blogs_profile";
const CLOUDINARY_PRESET_COVER  = "nomeo_blogs_cover";

const inputCls = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

type Tab = "profile" | "notifications" | "appearance" | "account";

function getPasswordStrength(pw: string): { score: number; label: string; tips: string[] } {
  if (!pw) return { score: 0, label: "", tips: [] };
  const tips: string[] = [];
  let score = 0;
  if (pw.length >= 8)            score++; else tips.push("At least 8 characters");
  if (/[A-Z]/.test(pw))          score++; else tips.push("At least one uppercase letter");
  if (/[0-9]/.test(pw))          score++; else tips.push("At least one number");
  if (/[^A-Za-z0-9]/.test(pw))  score++; else tips.push("At least one special character");
  return { score, label: ["", "Weak", "Fair", "Good", "Strong"][score] ?? "", tips };
}

async function fetchProfile() {
  const { data } = await api.get("/api/profile/me");
  return data;
}

async function fetchSettings() {
  const { data } = await api.get("/api/settings");
  return data.settings ?? {};
}

const Field = memo(({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
    {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
    {children}
  </div>
));
Field.displayName = "Field";

const SettingsSkeleton = memo(() => (
  <div className="grid gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_440px]">
    <div className="space-y-5 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-muted" />)}
    </div>
    <div className="h-72 rounded-2xl bg-muted animate-pulse lg:sticky lg:top-6 lg:self-start" />
  </div>
));
SettingsSkeleton.displayName = "SettingsSkeleton";

const TabBar = memo(({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) => {
  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "profile",       icon: <User    className="h-4 w-4" />, label: "Profile"       },
    { key: "notifications", icon: <Bell    className="h-4 w-4" />, label: "Notifications" },
    { key: "appearance",    icon: <Palette className="h-4 w-4" />, label: "Appearance"    },
    { key: "account",       icon: <Shield  className="h-4 w-4" />, label: "Account"       },
  ];
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
      {tabs.map(({ key, icon, label }) => (
        <button key={key} onClick={() => onChange(key)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            active === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
});
TabBar.displayName = "TabBar";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, preferences and account.</p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      {tab === "profile"       && <ProfileSettings />}
      {tab === "notifications" && <NotificationSettings />}
      {tab === "appearance"    && <AppearanceSettings />}
      {tab === "account"       && <AccountSettings />}
    </div>
  );
}

function ProfileSettings() {
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
                    <Camera className="h-3.5 w-3.5" />{cover ? "Change cover" : "Add cover"}
                  </button>
                  {cover && (
                    <button onClick={removeCover} aria-label="Remove cover"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
                      <X className="h-3.5 w-3.5" />
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
                    <Camera className="h-3.5 w-3.5" />
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
              <Sparkles className="h-3.5 w-3.5" /> Help me write it
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
            {form.occupation && <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground max-w-full"><Briefcase className="h-3 w-3 shrink-0" /><span className="truncate">{form.occupation}</span></p>}
            {form.location   && <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground max-w-full"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{form.location}</span></p>}
            {form.bio && (
              <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground w-full break-words text-left">
                {form.bio}
              </p>
            )}
            {(form.website || form.twitter || form.github) && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 w-full">
                {form.website && <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground"><Globe className="h-3 w-3" />Website</span>}
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
                <Check className="h-3 w-3 mt-0.5 shrink-0 text-primary" />{tip}
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

function NotificationSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn:  fetchSettings,
    staleTime: 0,
  });

  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean> | null>(null);

  const prefs: Record<string, boolean> = useMemo(
    () => ({ ...(settings?.notifications ?? {}), ...(localPrefs ?? {}) }),
    [settings, localPrefs]
  );

  const toggle = useCallback((key: string) => {
    setLocalPrefs(p => ({ ...(p ?? {}), [key]: !(prefs[key]) }));
  }, [prefs]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch("/api/settings", { notifications: prefs }),
    onSuccess: () => {
      toast.success("Notification preferences saved.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setLocalPrefs(null);
    },
    onError: () => toast.error("Couldn't save. Try again."),
  });

  const groups = [
    {
      label: "Email notifications",
      desc:  "Sent to your registered email address.",
      items: [
        { key: "emailNewFollower",        label: "New follower",           hint: "When someone follows you" },
        { key: "emailFollowRequest",       label: "Follow requests",        hint: "When someone sends a connection request" },
        { key: "emailNewComment",          label: "Comments on my posts",   hint: "When someone comments on your writing" },
        { key: "emailCommentReply",        label: "Comment replies",        hint: "When someone replies to your comment" },
        { key: "emailNewPost",             label: "New posts",              hint: "When someone you follow publishes" },
        { key: "emailLoungeActivity",      label: "Lounge activity",        hint: "New messages in lounges you're in" },
        { key: "emailSubscriptionAlerts",  label: "Subscription alerts",    hint: "Membership and billing updates" },
        { key: "emailAccountAlerts",       label: "Account alerts",         hint: "Important account notices" },
      ],
    },
    {
      label: "Push notifications",
      desc:  "In-app bell notifications shown in real time.",
      items: [
        { key: "pushNewFollower",    label: "New follower",      hint: "In-app notification when followed" },
        { key: "pushFollowRequest",  label: "Follow requests",   hint: "In-app notification for requests" },
        { key: "pushNewComment",     label: "Comments",          hint: "In-app notification for comments" },
        { key: "pushCommentReply",   label: "Comment replies",   hint: "In-app notification for replies" },
        { key: "pushNewPost",        label: "New posts",         hint: "In-app notification for new posts" },
        { key: "pushLoungeMessage",  label: "Lounge messages",   hint: "In-app notification for lounge activity" },
        { key: "pushLoungeMention",  label: "Lounge mentions",   hint: "When someone @mentions you in a lounge" },
      ],
    },
  ];

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{group.label}</p>
              <p className="text-xs text-muted-foreground">{group.desc}</p>
            </div>
            {group.items.map(({ key, label, hint }) => (
              <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <button onClick={() => toggle(key)} role="switch" aria-checked={!!prefs[key]}
                  className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    prefs[key] ? "bg-primary" : "bg-muted")}>
                  <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    prefs[key] ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About notifications</p>
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p><span className="font-semibold text-foreground">Email</span> — delivered to your inbox. Good for things you don't want to miss.</p>
            <p><span className="font-semibold text-foreground">Push</span> — appear in the bell icon while you're on the platform. Real-time and dismissable.</p>
            <p>Turn off any type individually without affecting the rest.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary">Note</p>
          <p className="mt-1 text-xs text-muted-foreground">Account alerts are always sent — they contain critical security information.</p>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn:  fetchSettings,
    staleTime: 0,
  });

  type Theme    = "light" | "dark" | "system";
  type FontSize = "sm" | "md" | "lg" | "xl";

  const [localPrefs, setLocalPrefs] = useState<{ theme?: Theme; fontSize?: FontSize } | null>(null);
  const prefs = useMemo(() => ({
    theme:    "system" as Theme,
    fontSize: "md"     as FontSize,
    ...(settings?.appearance ?? {}),
    ...(localPrefs ?? {}),
  }), [settings, localPrefs]);

  const fontSizeClassMap = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" } as const;
  const sampleTextCls   = fontSizeClassMap[prefs.fontSize as FontSize] ?? "text-sm";

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch("/api/settings", { appearance: prefs }),
    onSuccess: () => {
      toast.success("Appearance saved.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setLocalPrefs(null);
    },
    onError: () => toast.error("Couldn't save."),
  });

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {(["light","dark","system"] as const).map((t) => (
              <button key={t} onClick={() => setLocalPrefs(p => ({ ...(p ?? {}), theme: t }))}
                className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium capitalize transition-colors",
                  prefs.theme === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                <span className="text-2xl">{t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"}</span>
                {t}
                {prefs.theme === t && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Reading font size</p>
          <div className="grid grid-cols-4 gap-3">
            {([["sm","Small"],["md","Medium"],["lg","Large"],["xl","X-Large"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setLocalPrefs(p => ({ ...(p ?? {}), fontSize: val }))}
                className={cn("rounded-xl border py-3 text-sm font-medium transition-colors",
                  prefs.fontSize === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save appearance"}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preview</p>
          <div className={cn("space-y-2 leading-relaxed text-foreground", sampleTextCls)}>
            <p className="font-heading font-bold">The art of writing clearly</p>
            <p className="text-muted-foreground">Good writing is clear thinking made visible. When you write with precision, your readers follow effortlessly.</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Size: {prefs.fontSize.toUpperCase()} · Theme: {prefs.theme}</p>
        </div>
      </div>
    </div>
  );
}

function PwInput({
  label, placeholder, value, show, onChange, onToggleShow,
}: {
  label: string;
  placeholder: string;
  value: string;
  show: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShow: () => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value}
          onChange={onChange}
          className={cn(inputCls, "pr-10")} placeholder={placeholder} />
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function AccountSettings() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn:  fetchProfile,
    staleTime: 60_000,
  });

  const isOAuth  = profile?.isOAuth   ?? false;
  const provider = profile?.providerId ?? "credential";

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => getPasswordStrength(pwForm.next), [pwForm.next]);

  const changePassword = async () => {
    if (!pwForm.current)               { toast.error("Enter your current password."); return; }
    if (pwForm.next.length < 8)        { toast.error("New password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match."); return; }
    if (strength.score < 2)            { toast.error("Please choose a stronger password."); return; }
    setSaving(true);
    try {
      await api.post("/api/account/change-password", {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      toast.success("Password updated. Please log in again.");
      setPwForm({ current: "", next: "", confirm: "" });
      await authClient.signOut();
      router.push("/");
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Couldn't change password.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Email address</p>
          <p className="mt-1 text-sm text-foreground">{session?.user?.email ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">To change your email address, contact support.</p>
        </div>

        {isOAuth ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Password</p>
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-muted/30 p-4">
              <span className="text-xl">{provider === "google" ? "🔵" : "🔐"}</span>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">Signed in with {provider}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Password changes are managed through your {provider === "google" ? "Google account" : provider + " account"}.
                </p>
                {provider === "google" && (
                  <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Manage Google account →
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Change password</p>
            <PwInput label="Current password" placeholder="••••••••"
              value={pwForm.current} show={showPw.current}
              onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, current: !p.current }))} />
            <PwInput label="New password" placeholder="Min 8 characters"
              value={pwForm.next} show={showPw.next}
              onChange={(e) => setPwForm(p => ({ ...p, next: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, next: !p.next }))} />

            {pwForm.next.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors",
                      i < strength.score
                        ? strength.score <= 1 ? "bg-destructive" : strength.score === 2 ? "bg-yellow-500" : strength.score === 3 ? "bg-blue-500" : "bg-green-500"
                        : "bg-muted")} />
                  ))}
                </div>
                <p className={cn("text-xs font-medium",
                  strength.score <= 1 ? "text-destructive" : strength.score === 2 ? "text-yellow-600 dark:text-yellow-400" : strength.score === 3 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400")}>
                  {strength.label}
                </p>
                {strength.tips.length > 0 && (
                  <ul className="space-y-0.5">
                    {strength.tips.map(tip => (
                      <li key={tip} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <X className="h-3 w-3 text-destructive shrink-0" />{tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <PwInput label="Confirm new password" placeholder="••••••••"
              value={pwForm.confirm} show={showPw.confirm}
              onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-destructive">Passwords don't match.</p>
            )}
            <button onClick={changePassword} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        )}

        {/* Creator application — readers can upgrade to creator */}
        {profile?.role === "user" && <CreatorApplicationSection />}

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-heading text-base font-bold text-foreground">Delete account</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Permanently delete your account and all your data. This cannot be undone.</p>
              <button
                onClick={() => { if (!confirm("Are you absolutely sure? This cannot be undone.")) return; toast.error("Account deletion is managed by our support team. Contact us to proceed."); }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">
                Delete my account
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

        {/* Role badge */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your account</p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              profile?.role === "creator"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {profile?.role === "creator" ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {profile?.role === "creator" ? "Creator" : "Reader"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{session?.user?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            Member since{" "}
            {session?.user?.createdAt
              ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(session.user.createdAt))
              : "—"}
          </p>
          {profile?.role === "creator" && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              As a creator you can publish posts, manage subscribers and run a members lounge.
            </p>
          )}
          {profile?.role === "user" && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              You're a reader. Use the <span className="font-medium text-foreground">Become a creator</span> section below to apply for writing access.
            </p>
          )}
        </div>

        {/* Security tips — tailored to auth method */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Security tips</p>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            {isOAuth ? (
              <>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Your account is secured through {provider === "google" ? "Google" : provider}. No password is stored on Nomeo.</li>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Keep your {provider === "google" ? "Google" : provider} account secure — it controls access to Nomeo.</li>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Enable two-factor authentication on your {provider === "google" ? "Google" : provider} account for extra protection.</li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Use a unique password not shared with any other account.</li>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Include uppercase letters, numbers and symbols.</li>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Nomeo will never ask for your password.</li>
                <li className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Changing your password signs you out everywhere — you'll need to log in again.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Creator Application Section ──────────────────────────────────────────── */

function CreatorApplicationSection() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    motivation:     "",
    writingTopics:  "",
    portfolioLinks: "",
    sampleContent:  "",
  });

  const { data: appData, isLoading: checking } = useQuery({
    queryKey: ["creator-application"],
    queryFn: async () => {
      const { data } = await api.get("/api/creator-application");
      return data;
    },
    staleTime: 60_000,
  });

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: () => api.post("/api/creator-application", {
      motivation:     form.motivation.trim(),
      writingTopics:  form.writingTopics.trim(),
      portfolioLinks: form.portfolioLinks.trim(),
      sampleContent:  form.sampleContent.trim(),
    }),
    onSuccess: () => {
      toast.success("Application submitted! We'll review it and get back to you.");
      qc.invalidateQueries({ queryKey: ["creator-application"] });
      setExpanded(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error;
      const code = err?.response?.data?.code;
      if (code === "ALREADY_PENDING") {
        toast.info("You already have a pending application.");
        qc.invalidateQueries({ queryKey: ["creator-application"] });
      } else {
        toast.error(msg || "Couldn't submit. Try again.");
      }
    },
  });

  const status = appData?.status ?? null;

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  if (checking) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-2 h-3 w-72 rounded bg-muted" />
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="font-heading text-base font-bold text-foreground">You're a creator!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your application was approved. You can now publish posts and create your members lounge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-heading text-base font-bold text-foreground">Application under review</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We've received your application and will review it shortly. You'll be notified by email once a decision is made.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <X className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-heading text-base font-bold text-foreground">Application not approved</p>
            {appData?.reviewNote && (
              <p className="mt-1 text-sm text-muted-foreground">{appData.reviewNote}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              You're welcome to apply again with more detail about your writing plans.
            </p>
            <button
              onClick={() => setExpanded(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <PenLine className="h-4 w-4" /> Apply again
            </button>
          </div>
        </div>
        {expanded && <ApplicationForm form={form} f={f} submitting={submitting} onSubmit={() => submit()} onCancel={() => setExpanded(false)} />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-4"
      >
        <div className="text-left">
          <p className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Become a creator
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply to publish posts, build a readership and create a members lounge.
          </p>
        </div>
        {expanded
          ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <ApplicationForm
          form={form} f={f}
          submitting={submitting}
          onSubmit={() => submit()}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

function ApplicationForm({
  form, f, submitting, onSubmit, onCancel,
}: {
  form: { motivation: string; writingTopics: string; portfolioLinks: string; sampleContent: string };
  f: (k: any) => (e: any) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputCls = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

  const canSubmit = form.motivation.trim().length >= 30;

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <p className="text-xs text-muted-foreground">
        Tell us a little about yourself as a writer. All fields except the first are optional but help us understand you better.
      </p>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Why do you want to be a creator? <span className="text-destructive">*</span>
        </label>
        <textarea
          value={form.motivation}
          onChange={f("motivation")}
          rows={4}
          maxLength={1000}
          placeholder="Tell us what drives you to write and share. What story do you want to tell? (min 30 characters)"
          className={cn(inputCls, "resize-none")}
        />
        <p className={cn("mt-1 text-right text-xs", form.motivation.trim().length < 30 ? "text-destructive" : "text-muted-foreground")}>
          {form.motivation.trim().length}/1000 {form.motivation.trim().length < 30 && `(${30 - form.motivation.trim().length} more needed)`}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">What topics will you write about?</label>
        <input
          value={form.writingTopics}
          onChange={f("writingTopics")}
          placeholder="e.g. tech, culture, design, personal essays"
          maxLength={300}
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Portfolio or social links</label>
        <input
          value={form.portfolioLinks}
          onChange={f("portfolioLinks")}
          placeholder="Links to your blog, newsletter, Twitter, etc."
          maxLength={500}
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Sample writing (optional)</label>
        <textarea
          value={form.sampleContent}
          onChange={f("sampleContent")}
          rows={5}
          maxLength={2000}
          placeholder="Paste a short piece of your writing so we can see your style…"
          className={cn(inputCls, "resize-none")}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </div>
  );
}
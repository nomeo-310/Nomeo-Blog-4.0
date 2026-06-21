"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Image, X, Plus, Save, Send, Lock, Globe, Loader2, AlertCircle, Mail, Users, BookOpen, Search, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { PostEditor } from "./post-editor";
import ImageCropper from "@/components/auth/image-cropper";
import Modal from "@/components/ui/modal";
import { deleteImage } from "@/lib/delete-images";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";

const CATEGORIES = [
  "Technology", "Culture", "Science", "Health", "Business",
  "Lifestyle", "Travel", "Food", "Fiction", "Opinion", "Other",
];

const COAUTHOR_ROLES = [
  { value: "writer",   label: "Writer" },
  { value: "editor",   label: "Editor" },
  { value: "reviewer", label: "Reviewer" },
] as const;

type CoverImage   = { url: string; publicId: string } | null;
type Status       = "draft" | "published";
type CoAuthorRole = "writer" | "editor" | "reviewer";

type Series = { id: string; title: string; postsCount: number };

type CoAuthor = {
  userId:       string;
  name:         string;
  username:     string;
  avatar:       string;
  role:         CoAuthorRole;
  showOnByline: boolean;
};

type SearchUser = { id: string; name: string; username: string; avatar: string };

export default function NewPostPage() {
  const router = useRouter();

  // ── Content ─────────────────────────────────────────────────────────
  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");

  // ── Cover image ──────────────────────────────────────────────────────
  const [coverImage, setCoverImage] = useState<CoverImage>(null);
  const [cropFile,   setCropFile]   = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Meta ─────────────────────────────────────────────────────────────
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags,     setTags]     = useState<string[]>([]);
  const [access,   setAccess]   = useState<"free" | "paid">("free");

  // ── Series ───────────────────────────────────────────────────────────
  const [series,       setSeries]       = useState<Series[]>([]);
  const [seriesId,     setSeriesId]     = useState("");
  const [seriesOrder,  setSeriesOrder]  = useState<number | "">("");
  const [newSeriesModal, setNewSeriesModal] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDesc,  setNewSeriesDesc]  = useState("");
  const [creatingSeries, setCreatingSeries] = useState(false);

  // ── Co-authors ───────────────────────────────────────────────────────
  const [coAuthors,    setCoAuthors]    = useState<CoAuthor[]>([]);
  const [caQuery,      setCaQuery]      = useState("");
  const [caResults,    setCaResults]    = useState<SearchUser[]>([]);
  const [caSearching,  setCaSearching]  = useState(false);

  // ── UI ───────────────────────────────────────────────────────────────
  const [saving,           setSaving]           = useState(false);
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [followerCount,    setFollowerCount]    = useState<number | null>(null);

  // ── Load series + follower count on mount ───────────────────────────
  useEffect(() => {
    Promise.all([
      api.get<{ series: Series[] }>("/api/series").then(({ data }) => setSeries(data.series ?? [])),
      api.get<{ followersCount: number }>("/api/profile/me")
        .then(({ data }) => setFollowerCount(data.followersCount ?? 0))
        .catch(() => setFollowerCount(0)),
    ]);
  }, []);

  // ── Co-author search (debounced) ────────────────────────────────────
  useEffect(() => {
    if (caQuery.trim().length < 1) { setCaResults([]); return; }
    const t = setTimeout(async () => {
      setCaSearching(true);
      try {
        const { data } = await api.get<{ users: SearchUser[] }>(
          `/api/users/search?q=${encodeURIComponent(caQuery)}&creatorsOnly=true`
        );
        // Filter out already-added co-authors
        const added = new Set(coAuthors.map((ca) => ca.userId));
        setCaResults((data.users ?? []).filter((u) => !added.has(u.id)));
      } catch { setCaResults([]); }
      finally { setCaSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [caQuery, coAuthors]);

  const addCoAuthor = (user: SearchUser) => {
    setCoAuthors((prev) => [...prev, {
      userId: user.id, name: user.name, username: user.username,
      avatar: user.avatar, role: "writer", showOnByline: true,
    }]);
    setCaQuery(""); setCaResults([]);
  };
  const removeCoAuthor = (userId: string) =>
    setCoAuthors((prev) => prev.filter((ca) => ca.userId !== userId));
  const updateCoAuthor = (userId: string, patch: Partial<CoAuthor>) =>
    setCoAuthors((prev) => prev.map((ca) => ca.userId === userId ? { ...ca, ...patch } : ca));

  // ── Create new series inline ─────────────────────────────────────────
  const createSeries = async () => {
    if (!newSeriesTitle.trim()) return;
    setCreatingSeries(true);
    try {
      const { data } = await api.post<{ id: string; title: string }>("/api/series", {
        title: newSeriesTitle.trim(),
        description: newSeriesDesc.trim(),
      });
      const newS = { id: data.id, title: data.title, postsCount: 0 };
      setSeries((prev) => [newS, ...prev]);
      setSeriesId(data.id);
      setNewSeriesModal(false);
      setNewSeriesTitle(""); setNewSeriesDesc("");
      toast.success("Series created.");
    } catch { toast.error("Couldn't create series. Try again."); }
    finally { setCreatingSeries(false); }
  };

  // ── Cover image ──────────────────────────────────────────────────────
  const removeCoverImage = async () => {
    if (!coverImage) return;
    const { publicId } = coverImage;
    setCoverImage(null);
    try { await deleteImage(publicId); }
    catch { console.warn("[NewPostPage] Cloudinary delete failed for", publicId); }
  };

  // ── Tags ─────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  // ── Validation ───────────────────────────────────────────────────────
  const validate = (status: Status) => {
    const e: Record<string, string> = {};
    if (!title.trim())   e.title   = "Title is required.";
    if (!content.trim()) e.content = "Content is required.";
    if (status === "published" && !excerpt.trim())
      e.excerpt = "Excerpt is required before publishing.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const save = async (status: Status, withNewsletter = false) => {
    setSaving(true);
    setPublishModalOpen(false);
    try {
      await api.post("/api/posts", {
        title:   title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim(),
        coverImage: coverImage
          ? { secureUrl: coverImage.url, publicId: coverImage.publicId }
          : null,
        category,
        tags,
        access,
        status,
        sendAsNewsletter: status === "published" ? withNewsletter : false,
        seriesId:    seriesId || null,
        seriesOrder: seriesOrder !== "" ? Number(seriesOrder) : undefined,
        coAuthors:   coAuthors.map((ca) => ({
          userId:       ca.userId,
          role:         ca.role,
          showOnByline: ca.showOnByline,
        })),
      });
      toast.success(
        status === "published"
          ? withNewsletter ? "Post published and emailed to your followers!" : "Post published!"
          : "Draft saved."
      );
      router.push("/dashboard/posts");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Couldn't save. Try again.");
    } finally { setSaving(false); }
  };

  const handlePublishClick = () => {
    if (!validate("published")) { toast.error("Please fix the errors before publishing."); return; }
    setPublishModalOpen(true);
  };
  const handleDraftClick = () => {
    if (!validate("draft")) { toast.error("Please fix the errors before saving."); return; }
    save("draft");
  };

  return (
    <div className="w-full space-y-6">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">New post</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Write, preview, then publish when ready.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDraftClick} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </button>
          <button onClick={handlePublishClick} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* ── Cover image ──────────────────────────────────────────────── */}
      {cropFile ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <ImageCropper file={cropFile} aspect={16 / 9} cropShape="rect"
            uploadPreset={CLOUDINARY_PRESET_COVER}
            onCancel={() => setCropFile(null)}
            onUploaded={(img) => { setCoverImage(img); setCropFile(null); }} />
        </div>
      ) : coverImage ? (
        <div className="group relative w-full overflow-hidden rounded-2xl border border-border bg-muted" style={{ aspectRatio: "16/6" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={async () => { await removeCoverImage(); coverInputRef.current?.click(); }}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30">
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
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          style={{ aspectRatio: "16/6" }}>
          <Image className="h-9 w-9" />
          <div className="text-center">
            <p className="text-sm font-semibold">Add a cover image</p>
            <p className="mt-1 text-xs">Recommended: 1600 × 600px · JPG or PNG</p>
          </div>
        </button>
      )}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />

      {/* ── Two-column body ──────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(300px,400px)] xl:grid-cols-[1fr_minmax(340px,460px)] 2xl:grid-cols-[1fr_minmax(380px,480px)]">

        {/* Left — title + editor */}
        <div className="space-y-4">
          <div>
            <textarea value={title}
              onChange={(e) => { setTitle(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              placeholder="Post title" rows={2} maxLength={300}
              className={cn("w-full resize-none overflow-hidden rounded-2xl border bg-card px-5 py-4 font-heading text-2xl font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 md:text-3xl",
                errors.title ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
            {errors.title && <FieldError msg={errors.title} />}
            <p className="mt-1 text-right text-xs text-muted-foreground">{title.length}/300</p>
          </div>
          <div>
            <PostEditor value={content} onChange={setContent} placeholder="Tell your story…"
              className={errors.content ? "ring-2 ring-destructive/30" : ""} />
            {errors.content && <FieldError msg={errors.content} />}
          </div>
        </div>

        {/* Right — meta panels */}
        <div className="space-y-4">

          {/* Excerpt */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              Excerpt <span className="ml-1 font-normal text-muted-foreground">(required to publish)</span>
            </label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A short summary readers will see in the feed…" rows={5} maxLength={500}
              className={cn("w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
                errors.excerpt ? "border-destructive" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
            {errors.excerpt && <FieldError msg={errors.excerpt} />}
            <p className="mt-1 text-right text-xs text-muted-foreground">{excerpt.length}/500</p>
          </div>

          {/* Category */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="p-1">
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              Tags <span className="ml-1 font-normal text-muted-foreground">({tags.length}/10)</span>
            </label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. tech, culture…"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
              <button onClick={addTag} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    #{t}
                    <button onClick={() => removeTag(t)} className="ml-0.5 rounded-full hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Press Enter or comma to add.</p>
          </div>

          {/* Access */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Access</p>
            <div className="flex gap-2">
              <button onClick={() => setAccess("free")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                  access === "free" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                <Globe className="h-4 w-4" /> Free
              </button>
              <button onClick={() => setAccess("paid")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                  access === "paid" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                <Lock className="h-4 w-4" /> Members only
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {access === "paid" ? "Only subscribers with an active membership can read this post." : "Everyone can read this post for free."}
            </p>
          </div>

          {/* ── Series ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-foreground">
                <BookOpen className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                Series
              </label>
              <button onClick={() => setNewSeriesModal(true)}
                className="text-xs font-semibold text-primary hover:underline">
                + New series
              </button>
            </div>
            <Select value={seriesId} onValueChange={(v) => setSeriesId(v === "_none" || v === null ? "" : v)}>
              <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
                <SelectValue placeholder="None (standalone post)" />
              </SelectTrigger>
              <SelectContent className="p-1">
                <SelectItem value="_none">None (standalone post)</SelectItem>
                {series.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                    {s.postsCount > 0 && <span className="ml-1 text-muted-foreground">· {s.postsCount} posts</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {seriesId && (
              <div className="mt-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Part number in series</label>
                <input
                  type="number" min={1} value={seriesOrder}
                  onChange={(e) => setSeriesOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 1"
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <p className="mt-1 text-xs text-muted-foreground">Leave blank to append at the end.</p>
              </div>
            )}
          </div>

          {/* ── Co-authors ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              <UserPlus className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
              Co-authors
            </label>
            <p className="mb-3 text-xs text-muted-foreground">
              Invite creators you follow to collaborate. They'll receive a notification to accept.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={caQuery} onChange={(e) => setCaQuery(e.target.value)}
                placeholder="Search by name or @username…"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
            </div>

            {/* Search results dropdown */}
            {(caResults.length > 0 || caSearching) && (
              <div className="mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                {caSearching && (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                  </div>
                )}
                {caResults.map((u) => (
                  <button key={u.id} onClick={() => addCoAuthor(u)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent">
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.charAt(0)}</span>}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <Plus className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            )}

            {/* Added co-authors */}
            {coAuthors.length > 0 && (
              <div className="mt-3 space-y-2">
                {coAuthors.map((ca) => (
                  <div key={ca.userId} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      {ca.avatar
                        ? <img src={ca.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                        : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ca.name.charAt(0)}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{ca.name}</p>
                        <p className="text-xs text-muted-foreground">@{ca.username}</p>
                      </div>
                      <button onClick={() => removeCoAuthor(ca.userId)}
                        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {/* Role */}
                      <Select value={ca.role} onValueChange={(v) => updateCoAuthor(ca.userId, { role: v as CoAuthorRole })}>
                        <SelectTrigger className="h-8 w-32 rounded-lg border-border bg-muted/30 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COAUTHOR_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {/* Show on byline */}
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                        <button
                          onClick={() => updateCoAuthor(ca.userId, { showOnByline: !ca.showOnByline })}
                          className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors",
                            ca.showOnByline ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
                          {ca.showOnByline && <Check className="h-3 w-3" />}
                        </button>
                        Show on byline
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── New series modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={newSeriesModal}
        onClose={() => {setNewSeriesModal(false); setNewSeriesDesc(''); setNewSeriesTitle('')}}
        title="Create a new series"
        description="Group related posts into an ordered series."
        size="lg"
        isLoading={creatingSeries}
        primaryAction={{
          label: creatingSeries ? "Creating…" : "Create series",
          onClick: createSeries,
          loading: creatingSeries,
          disabled: !newSeriesTitle.trim(),
        }}
        secondaryAction={{ label: "Cancel", onClick: () => setNewSeriesModal(false) }}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Series title <span className="text-destructive">*</span></label>
            <input value={newSeriesTitle} onChange={(e) => setNewSeriesTitle(e.target.value)}
              placeholder="e.g. A Guide to Deep Work"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea value={newSeriesDesc} onChange={(e) => setNewSeriesDesc(e.target.value)}
              placeholder="What is this series about?"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
          </div>
        </div>
      </Modal>

      {/* ── Pre-publish confirmation modal ───────────────────────────── */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Ready to publish?"
        description="Review your post before it goes live."
        size="xl"
        isLoading={saving}
        closeOnOutsideClick={!saving}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={() => setPublishModalOpen(false)} disabled={saving}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
              Cancel
            </button>
            <button onClick={() => save("published", false)} disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish
            </button>
            {followerCount !== null && followerCount > 0 && (
              <button onClick={() => save("published", true)} disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Publish + Email followers
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {coverImage && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div>
            <h3 className="line-clamp-2 font-heading text-lg font-bold text-foreground">{title || "Untitled post"}</h3>
            {excerpt && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {category && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{category}</span>}
              {tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">#{t}</span>)}
              {seriesId && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><BookOpen className="h-3 w-3" />{series.find((s) => s.id === seriesId)?.title}</span>}
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                access === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {access === "paid" ? <><Lock className="h-3 w-3" /> Members only</> : <><Globe className="h-3 w-3" /> Free</>}
              </span>
            </div>
            {coAuthors.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Co-authors:</span>
                {coAuthors.map((ca) => (
                  <span key={ca.userId} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {ca.name} <span className="text-muted-foreground/60">({ca.role})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {followerCount !== null && followerCount > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  You have {followerCount.toLocaleString()} {followerCount === 1 ? "follower" : "followers"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Use <span className="font-semibold text-foreground">Publish + Email followers</span> to also send this post to their inboxes.
                  They'll receive the title, excerpt{coverImage ? ", and cover image" : ""}. This can't be undone.
                </p>
              </div>
            </div>
          )}
          {followerCount === 0 && (
            <p className="text-xs text-muted-foreground">
              You don't have any followers yet — your post will be visible on the platform once published.
            </p>
          )}
        </div>
      </Modal>

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
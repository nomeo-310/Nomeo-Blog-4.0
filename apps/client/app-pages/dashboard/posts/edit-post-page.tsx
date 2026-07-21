"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Image, X, Plus, Save, Send, Lock, Globe,
  Loader2, AlertCircle, Search, UserPlus, Check, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { deleteImage } from "@/lib/delete-images";
import { CoverImageField } from "./post-cover-image-field";
import { TitleContentPanel } from "./post-title-content-panel";
import { ExcerptField } from "./post-excerpt-field";
import { CategoryField } from "./post-category-field";
import { TagsField } from "./post-tags-field";
import { AccessField } from "./post-access-field";
import { SeriesField } from "./post-series-field";
import { NewSeriesModal } from "./post-new-series-modal";
import { CoAuthorsField } from "./post-coauthors-field";
import { EditPostPublishModal } from "./edit-post-publish-modal";
import type { CoAuthor, CoverImage, SearchUser, Series, Status } from "./post-form-types";

/**
 * EditPostPage — edit an existing post.
 *
 * Identical layout to NewPostPage but:
 *   • Fetches post on mount → pre-fills all fields including series + co-authors
 *   • Saves via PATCH /api/posts/[id]
 *   • "Publish" / "Save changes" label adapts to current post status
 *   • Co-authors with status "accepted" show a green badge (can't re-invite)
 *   • Cover image replace/remove calls deleteImage() for the old publicId
 *
 * Owns all form state + save/validation/fetch logic; rendering of each
 * distinct section is delegated to sibling components shared with
 * NewPostPage (see post-form-types.ts for the shared types) — only the
 * icon set (lucide-react here vs Hugeicons on NewPostPage) and a couple of
 * per-page values (crop aspect, excerpt rows, series select default) are
 * passed in as props.
 *
 * Route: app/dashboard/posts/[id]/edit/page.tsx
 */

export default function EditPostPage() {
  const router  = useRouter();
  const params  = useParams<{ id: string }>();
  const postId  = params.id;

  // ── Content ──────────────────────────────────────────────────────────
  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");

  // ── Cover image ──────────────────────────────────────────────────────
  const [coverImage, setCoverImage] = useState<CoverImage>(null);

  // ── Meta ─────────────────────────────────────────────────────────────
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags,     setTags]     = useState<string[]>([]);
  const [access,   setAccess]   = useState<"free" | "paid">("free");
  const [postStatus, setPostStatus] = useState<Status>("draft");

  // ── Series ───────────────────────────────────────────────────────────
  const [series,        setSeries]        = useState<Series[]>([]);
  const [seriesId,      setSeriesId]      = useState("");
  const [seriesOrder,   setSeriesOrder]   = useState<number | "">("");
  const [newSeriesModal, setNewSeriesModal] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDesc,  setNewSeriesDesc]  = useState("");
  const [creatingSeries, setCreatingSeries] = useState(false);

  // ── Co-authors ───────────────────────────────────────────────────────
  const [coAuthors,   setCoAuthors]   = useState<CoAuthor[]>([]);
  const [caQuery,     setCaQuery]     = useState("");
  const [caResults,   setCaResults]   = useState<SearchUser[]>([]);
  const [caSearching, setCaSearching] = useState(false);

  // ── UI ───────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [followerCount,    setFollowerCount]    = useState<number | null>(null);

  // ── Load post + series + follower count on mount ─────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: post }, { data: seriesData }, profileRes] = await Promise.all([
          api.get(`/api/posts/${postId}`),
          api.get<{ series: Series[] }>("/api/series"),
          api.get<{ followersCount: number }>("/api/profile/me").catch(() => ({ data: { followersCount: 0 } })),
        ]);

        setTitle(post.title ?? "");
        setContent(post.content ?? "");
        setExcerpt(post.excerpt ?? "");
        setCategory(post.category ?? "");
        setTags(post.tags ?? []);
        setAccess(post.access ?? "free");
        setPostStatus(post.status ?? "draft");
        setSeries(seriesData.series ?? []);
        setFollowerCount(profileRes.data.followersCount ?? 0);

        // Cover image: DB returns { secureUrl, publicId } → map to local { url, publicId }
        if (post.coverImage?.secureUrl) {
          setCoverImage({ url: post.coverImage.secureUrl, publicId: post.coverImage.publicId });
        }

        // Series
        if (post.seriesId) setSeriesId(post.seriesId);
        if (post.seriesOrder) setSeriesOrder(post.seriesOrder);

        // Co-authors — pre-fill with profile data fetched separately
        if (post.coAuthors?.length) {
          // Fetch profiles for each co-author userId
          const ids = post.coAuthors.map((ca: any) => ca.userId).join(",");
          const { data: profiles } = await api.get<{ users: SearchUser[] }>(
            `/api/users/profiles?ids=${ids}`
          ).catch(() => ({ data: { users: [] } }));

          const profileMap = new Map(profiles.users.map((u: SearchUser) => [u.id, u]));

          setCoAuthors(post.coAuthors.map((ca: any) => {
            const profile = profileMap.get(ca.userId);
            return {
              userId:       ca.userId,
              name:         profile?.name ?? "Unknown creator",
              username:     profile?.username ?? "",
              avatar:       profile?.avatar ?? "",
              role:         ca.role ?? "writer",
              showOnByline: ca.showOnByline !== false,
              status:       ca.status ?? "pending",
            };
          }));
        }
      } catch {
        toast.error("Couldn't load post. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  // ── Co-author search (debounced) ─────────────────────────────────────
  useEffect(() => {
    if (caQuery.trim().length < 1) { setCaResults([]); return; }
    const t = setTimeout(async () => {
      setCaSearching(true);
      try {
        const { data } = await api.get<{ users: SearchUser[] }>(
          `/api/users/search?q=${encodeURIComponent(caQuery)}&creatorsOnly=true`
        );
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
      avatar: user.avatar, role: "writer", showOnByline: true, status: "pending",
    }]);
    setCaQuery(""); setCaResults([]);
  };
  const removeCoAuthor = (userId: string) =>
    setCoAuthors((prev) => prev.filter((ca) => ca.userId !== userId));
  const updateCoAuthor = (userId: string, patch: Partial<CoAuthor>) =>
    setCoAuthors((prev) => prev.map((ca) => ca.userId === userId ? { ...ca, ...patch } : ca));

  // ── Create series inline ─────────────────────────────────────────────
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

  // ── Cover image helpers ───────────────────────────────────────────────
  const removeCoverImage = async () => {
    if (!coverImage) return;
    const { publicId } = coverImage;
    setCoverImage(null);
    try { await deleteImage(publicId); }
    catch { console.warn("[EditPostPage] Cloudinary delete failed for", publicId); }
  };

  // ── Tags ─────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  // ── Validation ────────────────────────────────────────────────────────
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
      await api.patch(`/api/posts/${postId}`, {
        title:   title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim(),
        coverImage: coverImage
          ? { url: coverImage.url, publicId: coverImage.publicId }
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
      setPostStatus(status);
      toast.success(
        status === "published"
          ? withNewsletter ? "Post saved and emailed to your followers!"
            : postStatus === "draft" ? "Post published!" : "Changes saved."
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

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded-xl bg-muted" />
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-full bg-muted" />
            <div className="h-10 w-28 rounded-full bg-muted" />
          </div>
        </div>
        <div className="w-full rounded-2xl bg-muted" style={{ aspectRatio: "16/6" }} />
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
          <div className="space-y-4">
            <div className="h-20 rounded-2xl bg-muted" />
            <div className="h-96 rounded-2xl bg-muted" />
          </div>
          <div className="space-y-4">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted" />)}
          </div>
        </div>
      </div>
    );
  }

  const isDraft = postStatus === "draft";

  return (
    <div className="w-full space-y-6">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Edit post</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isDraft ? "Finish writing, then publish when ready." : "Your post is live — changes save immediately."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <button onClick={handleDraftClick} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save draft
            </button>
          )}
          <button onClick={handlePublishClick} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isDraft ? "Publish" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Cover image ──────────────────────────────────────────────── */}
      <CoverImageField
        coverImage={coverImage}
        onCoverImageChange={setCoverImage}
        onRemove={removeCoverImage}
        cropperAspect={16 / 6}
        placeholderIcon={<Image className="h-9 w-9" />}
        removeIcon={<X className="h-4 w-4" />}
      />

      {/* ── Two-column body ──────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)] xl:grid-cols-[1fr_minmax(340px,420px)] 2xl:grid-cols-[1fr_minmax(380px,460px)]">

        {/* Left — title + editor */}
        <TitleContentPanel
          title={title}
          onTitleChange={setTitle}
          titleError={errors.title}
          content={content}
          onContentChange={setContent}
          contentError={errors.content}
          errorIcon={<AlertCircle className="h-3.5 w-3.5" />}
        />

        {/* Right — meta panels */}
        <div className="space-y-4">

          <ExcerptField
            value={excerpt}
            onChange={setExcerpt}
            error={errors.excerpt}
            errorIcon={<AlertCircle className="h-3.5 w-3.5" />}
            rows={3}
          />

          <CategoryField value={category} onChange={setCategory} />

          <TagsField
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            tags={tags}
            onAdd={addTag}
            onRemove={removeTag}
            addIcon={<Plus className="h-4 w-4" />}
            removeIcon={<X className="h-3 w-3" />}
          />

          <AccessField
            value={access}
            onChange={setAccess}
            freeIcon={<Globe className="h-4 w-4" />}
            paidIcon={<Lock className="h-4 w-4" />}
          />

          {/* ── Series ───────────────────────────────────────────────── */}
          <SeriesField
            series={series}
            selectValue={seriesId || "_none"}
            onSelectValueChange={(v) => { if (v === null) return; setSeriesId(v === "_none" ? "" : v); }}
            seriesId={seriesId}
            seriesOrder={seriesOrder}
            onSeriesOrderChange={setSeriesOrder}
            onNewSeriesClick={() => setNewSeriesModal(true)}
            icon={<BookOpen className="mr-1.5 inline h-4 w-4 text-muted-foreground" />}
          />

          {/* ── Co-authors ───────────────────────────────────────────── */}
          <CoAuthorsField
            coAuthors={coAuthors}
            caQuery={caQuery}
            onCaQueryChange={setCaQuery}
            caResults={caResults}
            caSearching={caSearching}
            onAdd={addCoAuthor}
            onRemove={removeCoAuthor}
            onUpdate={updateCoAuthor}
            description="Invite creators you follow. Accepted co-authors are shown with a green badge."
            headingIcon={<UserPlus className="mr-1.5 inline h-4 w-4 text-muted-foreground" />}
            searchIcon={<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
            addIcon={<Plus className="ml-auto h-4 w-4 shrink-0 text-primary" />}
            removeIcon={<X className="h-3.5 w-3.5" />}
            removeButtonClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
            checkIcon={<Check className="h-3 w-3" />}
          />

        </div>
      </div>

      {/* ── New series modal ──────────────────────────────────────────── */}
      <NewSeriesModal
        isOpen={newSeriesModal}
        onClose={() => setNewSeriesModal(false)}
        onCancel={() => setNewSeriesModal(false)}
        size="sm"
        newSeriesTitle={newSeriesTitle}
        onNewSeriesTitleChange={setNewSeriesTitle}
        newSeriesDesc={newSeriesDesc}
        onNewSeriesDescChange={setNewSeriesDesc}
        creatingSeries={creatingSeries}
        onCreate={createSeries}
      />

      {/* ── Save/publish confirmation modal ──────────────────────────── */}
      <EditPostPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        saving={saving}
        isDraft={isDraft}
        onPublish={() => save("published", false)}
        onPublishWithEmail={() => save("published", true)}
        followerCount={followerCount}
        coverImage={coverImage}
        title={title}
        excerpt={excerpt}
        category={category}
        tags={tags}
        series={series}
        seriesId={seriesId}
        access={access}
        coAuthors={coAuthors}
      />

    </div>
  );
}

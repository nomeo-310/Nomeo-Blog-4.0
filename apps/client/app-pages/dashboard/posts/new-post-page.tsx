"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageAdd01Icon, Cancel01Icon, SaveIcon, SentIcon, CircleLock02Icon, AlertCircle, UserAdd02Icon, BookOpen01Icon, Search01Icon, Globe02Icon, Add01Icon, CancelIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { api } from "@/lib/axios";
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
import { NewPostPublishModal } from "./new-post-publish-modal";
import type { CoAuthor, CoverImage, SearchUser, Series, Status } from "./post-form-types";

/**
 * NewPostPage — create a new post.
 *
 * Owns all form state + save/validation logic; rendering of each
 * distinct section (cover image, title/editor, excerpt, category, tags,
 * access, series, co-authors, publish confirmation) is delegated to
 * sibling components in this folder, several of which are also used by
 * EditPostPage (see post-form-types.ts for the shared types).
 *
 * Route: app/dashboard/posts/new/page.tsx
 */

export default function NewPostPage() {
  const router = useRouter();

  // ── Content ─────────────────────────────────────────────────────────
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
            Save draft
          </button>
          <button onClick={handlePublishClick} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SentIcon} className="h-4 w-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* ── Cover image ──────────────────────────────────────────────── */}
      <CoverImageField
        coverImage={coverImage}
        onCoverImageChange={setCoverImage}
        onRemove={removeCoverImage}
        cropperAspect={16 / 9}
        placeholderIcon={<HugeiconsIcon icon={ImageAdd01Icon} className="h-9 w-9" />}
        removeIcon={<HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />}
      />

      {/* ── Two-column body ──────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(300px,400px)] xl:grid-cols-[1fr_minmax(340px,460px)] 2xl:grid-cols-[1fr_minmax(380px,480px)]">

        {/* Left — title + editor */}
        <TitleContentPanel
          title={title}
          onTitleChange={setTitle}
          titleError={errors.title}
          content={content}
          onContentChange={setContent}
          contentError={errors.content}
          errorIcon={<HugeiconsIcon icon={AlertCircle} className="h-3.5 w-3.5" />}
        />

        {/* Right — meta panels */}
        <div className="space-y-4">

          <ExcerptField
            value={excerpt}
            onChange={setExcerpt}
            error={errors.excerpt}
            errorIcon={<HugeiconsIcon icon={AlertCircle} className="h-3.5 w-3.5" />}
            rows={5}
          />

          <CategoryField value={category} onChange={setCategory} />

          <TagsField
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            tags={tags}
            onAdd={addTag}
            onRemove={removeTag}
            addIcon={<HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />}
            removeIcon={<HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />}
          />

          <AccessField
            value={access}
            onChange={setAccess}
            freeIcon={<HugeiconsIcon icon={Globe02Icon} className="h-4 w-4" />}
            paidIcon={<HugeiconsIcon icon={CircleLock02Icon} className="h-4 w-4" />}
          />

          {/* ── Series ─────────────────────────────────────────────── */}
          <SeriesField
            series={series}
            selectValue={seriesId}
            onSelectValueChange={(v) => setSeriesId(v === "_none" || v === null ? "" : v)}
            seriesId={seriesId}
            seriesOrder={seriesOrder}
            onSeriesOrderChange={setSeriesOrder}
            onNewSeriesClick={() => setNewSeriesModal(true)}
            icon={<HugeiconsIcon icon={BookOpen01Icon} className="mr-1.5 inline h-4 w-4 text-muted-foreground" />}
          />

          {/* ── Co-authors ─────────────────────────────────────────── */}
          <CoAuthorsField
            coAuthors={coAuthors}
            caQuery={caQuery}
            onCaQueryChange={setCaQuery}
            caResults={caResults}
            caSearching={caSearching}
            onAdd={addCoAuthor}
            onRemove={removeCoAuthor}
            onUpdate={updateCoAuthor}
            description="Invite creators you follow to collaborate. They'll receive a notification to accept."
            headingIcon={<HugeiconsIcon icon={UserAdd02Icon} className="mr-1.5 inline h-4 w-4 text-muted-foreground" />}
            searchIcon={<HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
            addIcon={<HugeiconsIcon icon={Add01Icon} className="ml-auto h-4 w-4 shrink-0 text-primary" />}
            removeIcon={<HugeiconsIcon icon={CancelIcon} className="h-3.5 w-3.5" />}
            removeButtonClassName="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
            checkIcon={<HugeiconsIcon icon={Tick02Icon} className="h-3 w-3" />}
          />

        </div>
      </div>

      {/* ── New series modal ─────────────────────────────────────────── */}
      <NewSeriesModal
        isOpen={newSeriesModal}
        onClose={() => { setNewSeriesModal(false); setNewSeriesDesc(""); setNewSeriesTitle(""); }}
        onCancel={() => setNewSeriesModal(false)}
        size="lg"
        newSeriesTitle={newSeriesTitle}
        onNewSeriesTitleChange={setNewSeriesTitle}
        newSeriesDesc={newSeriesDesc}
        onNewSeriesDescChange={setNewSeriesDesc}
        creatingSeries={creatingSeries}
        onCreate={createSeries}
      />

      {/* ── Pre-publish confirmation modal ───────────────────────────── */}
      <NewPostPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        saving={saving}
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

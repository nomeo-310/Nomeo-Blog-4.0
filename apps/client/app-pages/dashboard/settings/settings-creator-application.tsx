"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon, Clock03Icon, Edit01Icon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * CreatorApplicationSection — lets a reader apply to become a creator.
 *
 * Shown inside the Account tab (only for users with role "user"). Owns its
 * own query/mutation and form state, independent of the rest of the tab.
 */
export function CreatorApplicationSection() {
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
          <HugeiconsIcon icon={Tick02Icon} className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
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
          <HugeiconsIcon icon={Clock03Icon} className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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
          <HugeiconsIcon icon={Cancel01Icon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
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
              <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" /> Apply again
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
            <HugeiconsIcon icon={Edit01Icon} className="h-5 w-5 text-primary" />
            Become a creator
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply to publish posts, build a readership and create a members lounge.
          </p>
        </div>
        {expanded
          ? <HugeiconsIcon icon={ArrowUp01Icon} className="h-5 w-5 shrink-0 text-muted-foreground" />
          : <HugeiconsIcon icon={ArrowDown01Icon} className="h-5 w-5 shrink-0 text-muted-foreground" />}
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </div>
  );
}

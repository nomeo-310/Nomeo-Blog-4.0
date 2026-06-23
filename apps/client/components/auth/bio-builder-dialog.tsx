"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Check, RefreshCw, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { BioStyle, buildBios } from "./build-bio";

const STYLES: { value: BioStyle; label: string; emoji: string }[] = [
  { value: "friendly",     label: "Friendly",     emoji: "😊" },
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "witty",        label: "Witty",        emoji: "😄" },
  { value: "minimal",      label: "Minimal",      emoji: "✦"  },
  { value: "storyteller",  label: "Storyteller",  emoji: "📖" },
];

const INTERESTS_OPTIONS   = ["Reading", "Writing", "Cooking", "Photography", "Music", "Art", "Sports", "Gaming", "Tech", "Other"];
const LIKES_OPTIONS       = ["Making new friends", "Tasting new foods", "Travelling", "Learning", "Exploring", "Creating", "Connecting", "Other"];
const DISLIKES_OPTIONS    = ["Liars", "Fraudulent people", "Pretentious people", "Dishonesty", "Negativity", "Close-mindedness", "Other"];
const PERSONAL_TOUCHES    = ["Coffee addict", "Night owl", "Dog person", "Cat person", "Avid traveller", "Bookworm", "Foodie", "Other"];
const ASPIRATIONS_OPTIONS = ["Make the world better", "Connect cultures", "Tell stories", "Build community", "Create art", "Inspire others", "Learn constantly", "Other"];

interface BioBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (bio: string) => void;
  defaults?: {
    occupation?: string;
    interests?: string[];
    intent?: "reader" | "writer";
  };
}

type Screen = "step1" | "step2" | "results";

export default function BioBuilderDialog({ open, onClose, onPick, defaults }: BioBuilderDialogProps) {

  // ── Form state ───────────────────────────────────────────────────────
  const [style,         setStyle]         = useState<BioStyle>("friendly");
  const [occupation,    setOccupation]    = useState(defaults?.occupation ?? "");
  const [interests,     setInterests]     = useState<string[]>(defaults?.interests ?? []);
  const [likes,         setLikes]         = useState<string[]>([]);
  const [dislikes,      setDislikes]      = useState<string[]>([]);
  const [personalTouch, setPersonalTouch] = useState("");
  const [customTouch,   setCustomTouch]   = useState("");
  const [aspirations,   setAspirations]   = useState<string[]>([]);
  const [hopeForFuture, setHopeForFuture] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [extra,         setExtra]         = useState("");

  // ── UI state ─────────────────────────────────────────────────────────
  const [screen,  setScreen]  = useState<Screen>("step1");
  const [bios,    setBios]    = useState<string[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper to completely scrub form states back to initial baselines
  const clearForm = () => {
    setStyle("friendly");
    setOccupation(defaults?.occupation ?? "");
    setInterests(defaults?.interests ?? []);
    setLikes([]);
    setDislikes([]);
    setPersonalTouch("");
    setCustomTouch("");
    setAspirations([]);
    setHopeForFuture("");
    setFavoriteQuote("");
    setExtra("");
  };

  const reset = () => {
    setScreen("step1");
    setBios([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    clearForm(); // Triggers on exit so nothing lingers next time it maps open
    onClose();
  };

  const generate = () => {
    setError(null);
    if (!occupation.trim() && interests.length === 0) {
      setError("Add at least your occupation or one interest to get started.");
      return;
    }
    setLoading(true);
    const resolvedTouch = personalTouch === "Other" ? customTouch.trim() : personalTouch;
    
    setTimeout(() => {
      const result = buildBios({
        style,
        occupation:    occupation.trim() || undefined,
        interests:     interests.length   ? interests   : undefined,
        likes:         likes.length       ? likes       : undefined,
        dislikes:      dislikes.length    ? dislikes    : undefined,
        personalTouch: resolvedTouch      || undefined,
        aspirations:   aspirations.length ? aspirations : undefined,
        hopeForFuture: hopeForFuture.trim() || undefined,
        favoriteQuote: favoriteQuote.trim() || undefined,
        extra:         extra.trim()       || undefined,
        intent:        defaults?.intent,
      });
      
      setLoading(false);
      if (result.length === 0) {
        setError("We couldn't generate a bio from those details. Try adding more.");
        return;
      }
      setBios(result);
      setScreen("results");
    }, 400);
  };

  const titles: Record<Screen, string> = {
    step1:   "Help me write my bio",
    step2:   "Tell us a bit more",
    results: "Pick your bio",
  };
  const descriptions: Record<Screen, string> = {
    step1:   "Step 1 of 2 — The essentials",
    step2:   "Step 2 of 2 — All optional, adds personality",
    results: "Pick one — you can edit it after.",
  };

  const renderActions = () => {
    if (screen === "step1") return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClose} className="flex-1 rounded-full">Cancel</Button>
        <Button variant="outline" onClick={() => setScreen("step2")} className="rounded-full px-4">
          More options <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button onClick={generate} disabled={loading} className="flex-1 rounded-full">
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate
        </Button>
      </div>
    );
    if (screen === "step2") return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setScreen("step1")} className="rounded-full px-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={generate} disabled={loading} className="flex-1 rounded-full">
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate bio
        </Button>
      </div>
    );
    if (screen === "results") return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setScreen("step1")} className="rounded-full px-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" onClick={generate} disabled={loading} className="flex-1 rounded-full">
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Try again
        </Button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={titles[screen]}
      description={descriptions[screen]}
      size="xl"
      maxHeight
      stickyActions="bottom"
      isLoading={loading}
      closeOnOutsideClick={!loading}
      actions={renderActions()}
      customBodyClassName="px-0 py-0"
    >
      <div className="px-5 py-4">

        {/* ── Step 1 ──────────────────────────────────────────────── */}
        {screen === "step1" && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Tone</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStyle(s.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                      style === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}>
                    <span>{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                What do you do? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input value={occupation} onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Software engineer, student, designer" className="rounded-xl" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Interests <span className="font-normal text-muted-foreground">(pick a few)</span>
              </label>
              <MultiSelect options={INTERESTS_OPTIONS} value={interests} onChange={setInterests}
                placeholder="What are you into?" />
            </div>

            {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* ── Step 2 ──────────────────────────────────────────────── */}
        {screen === "step2" && (
          <div className="space-y-5">
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              All fields below are optional — fill in what feels right. The more you add, the more personal your bio will be.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">What do you enjoy?</label>
              <MultiSelect options={LIKES_OPTIONS} value={likes} onChange={setLikes} placeholder="Things you love" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">What do you avoid?</label>
              <MultiSelect options={DISLIKES_OPTIONS} value={dislikes} onChange={setDislikes} placeholder="Things you steer clear of" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">A personal touch</label>
              <SimpleSelect value={personalTouch} onChange={setPersonalTouch}
                placeholder="Pick one (optional)" options={PERSONAL_TOUCHES} />
              {personalTouch === "Other" && (
                <Input value={customTouch} onChange={(e) => setCustomTouch(e.target.value)}
                  placeholder="Describe it in a few words" className="mt-2 rounded-xl" />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Your aspirations</label>
              <MultiSelect options={ASPIRATIONS_OPTIONS} value={aspirations} onChange={setAspirations}
                placeholder="What are you working towards?" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Hope for the future</label>
              <textarea value={hopeForFuture} onChange={(e) => setHopeForFuture(e.target.value)}
                maxLength={400} rows={3}
                placeholder="e.g. a world where everyone shows kindness and works together"
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">A quote you live by</label>
              <Input value={favoriteQuote} onChange={(e) => setFavoriteQuote(e.target.value)}
                placeholder='"The journey of a thousand miles…"' className="rounded-xl" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Anything else?</label>
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)}
                maxLength={400} rows={3} placeholder="Something that makes you, you."
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────── */}
        {screen === "results" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Drafting your bio…</p>
              </div>
            ) : (
              bios.map((b, i) => (
                <button key={i} onClick={() => { onPick(b); handleClose(); }}
                  className="group flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 transition-all group-hover:border-primary group-hover:bg-primary">
                    <Check className="h-3 w-3 text-transparent group-hover:text-primary-foreground" />
                  </span>
                  <span className="text-sm leading-relaxed text-card-foreground">{b}</span>
                </button>
              ))
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}

/* ── MultiSelect ─────────────────────────────────────────────────────────── */

function MultiSelect({
  options, value, onChange, placeholder,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen]             = useState(false);
  const [otherInput, setOtherInput] = useState("");
  const [rect, setRect]             = useState<DOMRect | null>(null);
  const triggerRef                  = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  const addCustom = () => {
    const t = otherInput.trim();
    if (!t || value.includes(t)) return;
    onChange([...value.filter((v) => v !== "Other"), t]);
    setOtherInput("");
  };

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  const dropdown = rect && open && mounted ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 90000 }} onClick={() => setOpen(false)} />
      <div
        className="max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl"
        style={{ position: "fixed", zIndex: 90001, top: rect.bottom + 6, left: rect.left, width: rect.width }}
      >
        {options.map((o) => {
          if (o === "Other") {
            return (
              <div key="other" className="flex items-center gap-2 rounded-lg p-1.5">
                <input
                  type="text"
                  placeholder="Add your own…"
                  value={otherInput}
                  onChange={(e) => setOtherInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button type="button" onClick={addCustom}
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  Add
                </button>
              </div>
            );
          }
          return (
            <button key={o} type="button" onClick={() => toggle(o)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                value.includes(o) ? "font-semibold text-primary" : "text-popover-foreground"
              )}>
              {o}
              {value.includes(o) && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-sm transition-colors",
          open ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
          value.length === 0 && "text-muted-foreground"
        )}
      >
        {value.length > 0 ? (
          value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {v}
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)); }}
                className="ml-0.5 hover:text-destructive">×</button>
            </span>
          ))
        ) : (
          <span>{placeholder || "Select options"}</span>
        )}
        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {dropdown}
    </div>
  );
}

/* ── SimpleSelect ────────────────────────────────────────────────────────── */

function SimpleSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen]       = useState(false);
  const [rect, setRect]       = useState<DOMRect | null>(null);
  const triggerRef            = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  const dropdown = rect && open && mounted ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 90000 }} onClick={() => setOpen(false)} />
      <div
        className="max-h-52 overflow-y-auto rounded-xl border border-border bg-popover py-1.5 shadow-xl"
        style={{ position: "fixed", zIndex: 90001, top: rect.bottom + 6, left: rect.left, width: rect.width }}
      >
        {options.map((o) => (
          <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
            className={cn(
              "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors hover:bg-accent",
              o === value ? "font-semibold text-primary" : "text-popover-foreground"
            )}>
            {o}
            {o === value && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm transition-colors",
          open ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
          !value && "text-muted-foreground"
        )}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {dropdown}
    </div>
  );
}
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, Check, BookOpen, PenLine, CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SignupIntent } from "@/types/onboarding-types";
import ImageCropper, { UploadedImage } from "./image-cropper";
import { completeOnboarding } from "@/services/onboarding-service";

const CLOUDINARY_PRESET_PROFILE = "nomeo_blogs_profile"; // unsigned preset for avatars
const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";     // unsigned preset for covers

/**
 * OnboardingModal — split-panel, multi-step, reuses the AuthModal design.
 *
 * Steps:
 *   1. intent    — reader or writer
 *   2. profile   — username, display name, pronouns, avatar
 *   3. details   — gender, date of birth, bio, location, occupation (optional)
 *   4. interests — topic slugs (everyone) + creator topics (writers only)
 *   5. done      — welcome
 *
 * Non-dismissable: no close button, no escape, no outside-click. It closes only
 * after completeOnboarding() succeeds, followed by a full navigation so the
 * fresh role/onboardingCompleted state is picked up everywhere.
 */

type Step = "intent" | "profile" | "details" | "interests" | "done";

const STEP_ORDER: Step[] = ["intent", "profile", "details", "interests", "done"];

interface TopicOption {
  slug: string;
  label: string;
  icon?: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  topics: TopicOption[];
  initialStepIndex?: number;
  defaults?: {
    username?: string;
    displayName?: string;
  };
}

export default function OnboardingModal({ isOpen, onComplete, topics, initialStepIndex = 0, defaults }: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const step = STEP_ORDER[stepIndex];

  // Form state
  const [intent, setIntent] = useState<SignupIntent | null>(null);
  const [username, setUsername] = useState(defaults?.username ?? "");
  const [displayName, setDisplayName] = useState(defaults?.displayName ?? "");
  const [pronouns, setPronouns] = useState("");
  const [gender, setGender] = useState<string>("prefer_not_to_say");
  // Date of birth held as a Date object; converted to ISO on submit.
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [creatorTopics, setCreatorTopics] = useState<string[]>([]);

  // Images
  const [profileImage, setProfileImage] = useState<UploadedImage | null>(null);
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [cropping, setCropping] = useState<{ target: "profile" | "cover"; file: File } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWriter = intent === "writer";
  const totalSteps = STEP_ORDER.length;

  const content = useMemo(() => {
    const map: Record<Step, { image: string; sideTitle: string; sideDesc: string; eyebrow: string; title: string; desc: string }> = {
      intent: {
        image: "/images/onboarding-1.jpg",
        sideTitle: "Welcome to Nomeo.",
        sideDesc: "Let's set up your space. It takes less than a minute.",
        eyebrow: "Getting started",
        title: "How will you use Nomeo?",
        desc: "You can always change this later.",
      },
      profile: {
        image: "/images/onboarding-2.jpg",
        sideTitle: "Make it yours.",
        sideDesc: "Your handle and name are how readers will find and know you.",
        eyebrow: `Step ${stepIndex + 1} of ${totalSteps}`,
        title: "Set up your profile.",
        desc: "Choose how you'll appear across Nomeo.",
      },
      details: {
        image: "/images/onboarding-3.jpg",
        sideTitle: "A little more.",
        sideDesc: "Optional details that help personalise your experience.",
        eyebrow: `Step ${stepIndex + 1} of ${totalSteps}`,
        title: "Tell us about you.",
        desc: "All optional — skip anything you'd rather not share.",
      },
      interests: {
        image: "/images/onboarding-4.jpg",
        sideTitle: "Find your topics.",
        sideDesc: "We'll use these to shape your feed and recommendations.",
        eyebrow: `Step ${stepIndex + 1} of ${totalSteps}`,
        title: isWriter ? "Interests & topics." : "Pick your interests.",
        desc: isWriter
          ? "What you want to read, and what you'll write about."
          : "Choose a few topics you'd like to see more of.",
      },
      done: {
        image: "/images/onboarding-5.jpg",
        sideTitle: "You're all set.",
        sideDesc: "Welcome to the community. Time to dive in.",
        eyebrow: "All done",
        title: "You're ready.",
        desc: isWriter
          ? "Your creator space is live. Publish your first post whenever you're ready."
          : "Your feed is tuned to your interests. Start reading.",
      },
    };
    return map[step];
  }, [step, stepIndex, totalSteps, isWriter]);

  const goNext = () => setStepIndex((i) => Math.min(STEP_ORDER.length - 1, i + 1));
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const toggle = (list: string[], setList: (v: string[]) => void, slug: string) => {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  };

  // Age helper for the 13+ check
  const ageFrom = (d: Date) => {
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };

  /* ── Step validation + advancement ─────────────────────────────────── */
  const handleNext = () => {
    setError(null);

    if (step === "intent") {
      if (!intent) return setError("Choose how you'll use Nomeo.");
      return goNext();
    }

    if (step === "profile") {
      if (!username.trim()) return setError("Pick a username.");
      if (!/^[a-z0-9_]{3,32}$/.test(username.trim().toLowerCase()))
        return setError("Username: 3–32 chars, lowercase letters, numbers, underscores.");
      if (!displayName.trim()) return setError("Enter a display name.");
      return goNext();
    }

    if (step === "details") {
      if (dateOfBirth && ageFrom(dateOfBirth) < 13) {
        return setError("You must be at least 13 to use Nomeo.");
      }
      return goNext();
    }

    if (step === "interests") {
      if (interests.length === 0) return setError("Pick at least one interest.");
      if (isWriter && creatorTopics.length === 0)
        return setError("Pick at least one topic you'll write about.");
      return goNext();
    }
  };

  /* ── Final submit ──────────────────────────────────────────────────── */
  const handleFinish = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await completeOnboarding({
        intent: intent!,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        pronouns: pronouns.trim() || undefined,
        gender: gender as never,
        // Convert the Date to an ISO yyyy-mm-dd string for the service
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        occupation: occupation.trim() || undefined,
        interests,
        creatorTopics: isWriter ? creatorTopics : undefined,
        profileImage: profileImage ?? undefined,
        coverImage: isWriter ? coverImage ?? undefined : undefined,
      });

      if (res?.success) {
        toast.success(isWriter ? "Your creator space is ready!" : "You're all set!");
        onComplete();
        window.location.assign(isWriter ? "/dashboard" : "/");
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg === "USERNAME_TAKEN") {
        setError("That username is taken. Try another.");
        setStepIndex(STEP_ORDER.indexOf("profile"));
      } else if (msg === "UNDER_MINIMUM_AGE") {
        setError("You must be at least 13 to use Nomeo.");
        setStepIndex(STEP_ORDER.indexOf("details"));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const showBack = stepIndex > 0 && step !== "done";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { }}               // non-dismissable
      size="2xl"
      showCloseButton={false}
      closeOnOutsideClick={false}
      closeOnEscape={false}
      customHeaderClassName="hidden"
      customBodyClassName="!p-0 [&>div]:!p-0 overflow-hidden"
      maxHeight
    >
      <div className="relative grid h-[600px] max-h-[85vh] grid-cols-1 overflow-hidden rounded-lg md:grid-cols-2">
        {/* ── Left panel ──────────────────────────────────────────── */}
        <div className="relative hidden h-full w-full overflow-hidden rounded-l-lg md:block">
          <Image key={content.image} src={content.image} alt="" fill sizes="50vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-primary/10" />
          <div className="absolute inset-0 z-10 flex flex-col justify-end p-8">
            <h2 className="font-heading text-3xl font-bold leading-tight text-white">{content.sideTitle}</h2>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-white/85">{content.sideDesc}</p>
          </div>
          <div className="absolute left-8 top-8 z-10 flex gap-1.5">
            {STEP_ORDER.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === stepIndex ? "w-6 bg-white" : i < stepIndex ? "w-1.5 bg-white/80" : "w-1.5 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div className="custom-scrollbar flex h-full flex-col overflow-y-auto rounded-lg bg-card px-6 py-10 sm:px-10 md:rounded-l-none">
          {cropping ? (
            <div className="my-auto w-full">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {cropping.target === "profile" ? "Profile photo" : "Cover image"}
              </p>
              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-card-foreground">
                Crop your {cropping.target === "profile" ? "photo" : "cover"}.
              </h1>
              <div className="mt-5">
                <ImageCropper
                  file={cropping.file}
                  aspect={cropping.target === "profile" ? 1 : 3}
                  cropShape={cropping.target === "profile" ? "round" : "rect"}
                  uploadPreset={cropping.target === "profile" ? CLOUDINARY_PRESET_PROFILE : CLOUDINARY_PRESET_COVER}
                  onCancel={() => setCropping(null)}
                  onUploaded={(img) => {
                    if (cropping.target === "profile") setProfileImage(img);
                    else setCoverImage(img);
                    setCropping(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="my-auto w-full">
              {showBack && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}

              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{content.eyebrow}</p>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-card-foreground">{content.title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{content.desc}</p>

              <div className="mt-7">
                {/* STEP: intent */}
                {step === "intent" && (
                  <div className="grid gap-3">
                    <IntentCard
                      selected={intent === "reader"}
                      onClick={() => setIntent("reader")}
                      icon={<BookOpen className="h-5 w-5" />}
                      title="I'm here to read"
                      desc="Follow writers, save posts, and explore stories."
                    />
                    <IntentCard
                      selected={intent === "writer"}
                      onClick={() => setIntent("writer")}
                      icon={<PenLine className="h-5 w-5" />}
                      title="I'm here to write"
                      desc="Publish posts, build a following, and earn."
                    />
                  </div>
                )}

                {/* STEP: profile */}
                {step === "profile" && (
                  <div className="space-y-4">
                    {/* Avatar uploader */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profileImage.url} alt="" className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                            {(displayName || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                          {profileImage ? "Change photo" : "Add a photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setCropping({ target: "profile", file: f });
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground">Optional. Square, JPG or PNG.</p>
                      </div>
                    </div>

                    <Field label="Username">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">@</span>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase())}
                          placeholder="adalovelace"
                          className="h-10 md:h-11"
                        />
                      </div>
                    </Field>
                    <Field label="Display name">
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada Lovelace" className="h-10 md:h-11" />
                    </Field>
                    <Field label="Pronouns (optional)">
                      <Input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="she/her" className="h-10 md:h-11" />
                    </Field>
                  </div>
                )}

                {/* STEP: details (all optional) */}
                {step === "details" && (
                  <div className="space-y-4">
                    {/* Cover image — writers only */}
                    {isWriter && (
                      <Field label="Cover image (optional)">
                        <div className="overflow-hidden rounded-lg border border-border">
                          {coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverImage.url} alt="" className="h-24 w-full object-cover" />
                          ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-muted">
                              <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                                Add a cover image
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setCropping({ target: "cover", file: f });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                        {coverImage && (
                          <label className="mt-1.5 inline-block cursor-pointer text-xs font-medium text-primary hover:underline">
                            Change cover
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setCropping({ target: "cover", file: f });
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </Field>
                    )}

                    {/* Gender — custom inline select (no portal → never clipped) */}
                    <Field label="Gender (optional)">
                      <InlineSelect
                        value={gender}
                        onChange={setGender}
                        options={[
                          { value: "prefer_not_to_say", label: "Prefer not to say" },
                          { value: "female", label: "Female" },
                          { value: "male", label: "Male" },
                          { value: "non_binary", label: "Non-binary" },
                        ]}
                      />
                    </Field>

                    {/* Date of birth — inline calendar (no portal → never clipped) */}
                    <Field label="Date of birth (optional)">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDobOpen((o) => !o)}
                        className={cn(
                          "h-10 w-full justify-start text-left font-normal md:h-11",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Pick your date of birth"}
                      </Button>

                      {dobOpen && (
                        <div className="mt-2 rounded-lg border border-border bg-popover p-2">
                          <Calendar
                            mode="single"
                            selected={dateOfBirth}
                            onSelect={(d) => {
                              setDateOfBirth(d);
                              setDobOpen(false);
                            }}
                            captionLayout="dropdown"
                            defaultMonth={new Date(1990, 0, 1)}
                            disabled={(date) => date > new Date() || date < new Date(1920, 0, 1)}
                            className="w-full [&_table]:w-full [&_.rdp-month]:w-full"
                          />
                        </div>
                      )}
                    </Field>

                    <Field label="Location (optional)">
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" className="h-10 md:h-11" />
                    </Field>
                    <Field label="Occupation (optional)">
                      <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Software engineer" className="h-10 md:h-11" />
                    </Field>
                    <Field label="Short bio (optional)">
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={200}
                        rows={3}
                        placeholder="A sentence or two about you."
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </Field>
                  </div>
                )}

                {/* STEP: interests */}
                {step === "interests" && (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-2 text-sm font-medium text-card-foreground">Topics you want to read</p>
                      <ChipGrid topics={topics} selected={interests} onToggle={(s) => toggle(interests, setInterests, s)} />
                    </div>
                    {isWriter && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-card-foreground">Topics you'll write about</p>
                        <ChipGrid topics={topics} selected={creatorTopics} onToggle={(s) => toggle(creatorTopics, setCreatorTopics, s)} />
                      </div>
                    )}
                  </div>
                )}

                {/* STEP: done */}
                {step === "done" && (
                  <div className="flex flex-col items-center py-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-8 w-8 text-primary" />
                    </span>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {isWriter
                        ? "Everything's ready. Let's get you to your dashboard."
                        : "Everything's ready. Let's find you something to read."}
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              {/* Footer action */}
              <div className="mt-7">
                {step === "done" ? (
                  <Button onClick={handleFinish} disabled={loading} className="h-11 w-full text-sm font-semibold">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isWriter ? "Go to dashboard" : "Start reading"}
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="h-11 w-full text-sm font-semibold">
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/**
 * InlineSelect — a dependency-free select that renders its dropdown INLINE
 * (absolutely positioned within its own relative wrapper), so it's never
 * clipped or focus-trapped by a parent modal the way portal-based selects are.
 * Height matches the Input (h-10 / md:h-11).
 */
function InlineSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3.5 text-sm transition-colors md:h-11",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          !selected && "text-muted-foreground"
        )}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                o.value === value ? "font-medium text-primary" : "text-popover-foreground"
              )}
            >
              {o.label}
              {o.value === value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-card-foreground">{label}</label>
      {children}
    </div>
  );
}

function IntentCard({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-accent"
      )}
    >
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-card-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

function ChipGrid({
  topics,
  selected,
  onToggle,
}: {
  topics: TopicOption[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => {
        const on = selected.includes(t.slug);
        return (
          <button
            key={t.slug}
            type="button"
            onClick={() => onToggle(t.slug)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-all",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-accent"
            )}
          >
          {t.label}
          </button>
        );
      })}
    </div>
  );
}
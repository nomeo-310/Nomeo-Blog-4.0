"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAQ_CATEGORIES, FAQ_CONTACT } from "./faqs";

/**
 * FAQ page — Nomeo.
 *
 * Matches the app design (forest-green tokens, Quicksand body / Urbanist
 * headings, container layout). Two parts:
 *   1. FAQ accordion grouped by category (built from scratch, animated)
 *   2. Contact form (id="contact") that posts to /api/contact → nodemailer
 *
 * The accordion animates height via grid-template-rows (0fr → 1fr), which is
 * the cleanest way to animate to auto height without measuring.
 */

export default function FaqPage() {
  const [activeId, setActiveId] = useState(FAQ_CATEGORIES[0].id);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const active = FAQ_CATEGORIES.find((c) => c.id === activeId) ?? FAQ_CATEGORIES[0];

  const selectCategory = (id: string) => {
    setActiveId(id);
    setOpenIndex(null); // collapse everything when switching category
  };

  return (
    <div className="w-full bg-background">
      <div>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mx-auto max-w-4xl pt-16 pb-10 text-center md:pt-24 md:pb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Help center</p>
          <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Everything about reading, writing, earning, and how we handle your
            data. Can&apos;t find what you need? Reach us below.
          </p>
        </header>

        {/* ── Tabbed FAQ: category rail (left) + questions (right) ─────── */}
        <div className="pb-20">
          <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-10">
            {/* Category rail */}
            <nav
              aria-label="FAQ categories"
              className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0"
            >
              {FAQ_CATEGORIES.map((cat) => {
                const on = cat.id === activeId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectCategory(cat.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "shrink-0 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors md:shrink",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {cat.title}
                  </button>
                );
              })}
            </nav>

            {/* Active category's questions */}
            <div key={active.id} className="min-w-0 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="mb-4">
                <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">{active.title}</h2>
                {active.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>
                )}
              </div>
              <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
                {active.items.map((item, i) => (
                  <AccordionItem
                    key={`${active.id}-${i}`}
                    question={item.q}
                    answer={item.a}
                    isOpen={openIndex === i}
                    onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <ContactSection />
      </div>
    </div>
  );
}

/* ── Accordion item (from scratch, animated) ────────────────────────────── */

function AccordionItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="text-sm font-medium text-card-foreground md:text-base">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Animated region: grid 0fr → 1fr expands to content height smoothly */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Contact section + form ─────────────────────────────────────────────── */

// Purpose options come from the FAQ category titles, plus a general fallback.
const PURPOSE_OPTIONS = ["General enquiry", ...FAQ_CATEGORIES.map((c) => c.title), "Something else"];

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24 border-t border-border py-16 md:py-24">
      <div className="mx-auto grid gap-12 md:grid-cols-2">
        {/* Left: invitation + direct emails */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
            Still have a question?
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Send us a message and we&apos;ll get back to you. Pick the topic that
            fits best so it reaches the right people faster.
          </p>

          <div className="mt-8 space-y-4">
            <DirectEmail label="General & support" email={FAQ_CONTACT.supportEmail} />
            <DirectEmail label="Privacy & your data" email={FAQ_CONTACT.privacyEmail} />
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{FAQ_CONTACT.company}</p>
            <p className="mt-1 max-w-xs leading-relaxed">{FAQ_CONTACT.address}</p>
          </div>
        </div>

        {/* Right: the form */}
        <ContactForm />
      </div>
    </section>
  );
}

function DirectEmail({ label, email }: { label: string; email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex items-center gap-3 text-sm transition-colors group"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
        <Mail className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block font-medium text-foreground group-hover:text-primary">{email}</span>
      </span>
    </a>
  );
}

function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError("Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (message.trim().length < 10) return setError("Your message is a little short — add a bit more detail.");

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), purpose, message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setStatus("idle");
        return;
      }
      setStatus("done");
      toast.success(data.message || "Message sent.");
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-7 w-7 text-primary" />
        </span>
        <h3 className="mt-4 font-heading text-lg font-bold text-foreground">Message sent</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Thanks for reaching out. We&apos;ll get back to you at the email you provided.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setFullName("");
            setEmail("");
            setMessage("");
            setPurpose(PURPOSE_OPTIONS[0]);
          }}
          className="mt-5 text-sm font-medium text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="space-y-4">
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>

        <Field label="What's it about?">
          <Select value={purpose} onValueChange={(value) => setPurpose(value ?? PURPOSE_OPTIONS[0])}>
            <SelectTrigger className="h-10 lg:h-11 w-full">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent className={'p-1'}>
              {PURPOSE_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Tell us how we can help…"
            className={cn(inputClass, "h-auto resize-none py-2.5 leading-relaxed")}
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          Send message
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-card-foreground">{label}</label>
      {children}
    </div>
  );
}
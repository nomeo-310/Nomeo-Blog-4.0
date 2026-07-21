"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FAQ_CATEGORIES } from "./faqs";

// Purpose options come from the FAQ category titles, plus a general fallback.
const PURPOSE_OPTIONS = ["General enquiry", ...FAQ_CATEGORIES.map((c) => c.title), "Something else"];

/** The contact form — validated client-side, posts to /api/contact → nodemailer. */
export function FaqContactForm() {
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
          <HugeiconsIcon icon={Tick02Icon} className="h-7 w-7 text-primary" />
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

"use client";

import { useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon, Share08Icon, Link05Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareOption {
  id:    string;
  label: string;
  color: string;
  bg:    string;
  icon:  React.ReactNode;
  href:  (url: string, title: string) => string;
}

/** Share-to-social panel, portalled to `document.body` by the caller. */
export function ShareModal({ title, coverImage, onClose, copied, setCopied }: {
  title:      string;
  coverImage?: string;
  onClose:    () => void;
  copied:     boolean;
  setCopied:  (v: boolean) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const url      = typeof window !== "undefined" ? window.location.href : "";
  const encoded  = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const options: ShareOption[] = [
    {
      id:    "twitter",
      label: "X / Twitter",
      color: "text-white",
      bg:    "bg-black hover:bg-neutral-800",
      icon:  <TwitterIcon />,
      href:  (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    },
    {
      id:    "facebook",
      label: "Facebook",
      color: "text-white",
      bg:    "bg-[#1877F2] hover:bg-[#166FE5]",
      icon:  <FacebookIcon />,
      href:  (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    },
    {
      id:    "whatsapp",
      label: "WhatsApp",
      color: "text-white",
      bg:    "bg-[#25D366] hover:bg-[#20BD5A]",
      icon:  <WhatsAppIcon />,
      href:  (u, t) => `https://wa.me/?text=${encodeURIComponent(t + " " + u)}`,
    },
    {
      id:    "email",
      label: "Email",
      color: "text-white",
      bg:    "bg-slate-600 hover:bg-slate-700",
      icon:  <MailIcon />,
      href:  (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent("I thought you'd enjoy this:\n\n" + u)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link.");
    }
  };

  const handleShare = (option: ShareOption) => {
    window.open(option.href(url, title), "_blank", "noopener,noreferrer,width=600,height=500");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-[90000] flex justify-center bg-black/50 backdrop-blur-sm items-center px-4"
      >
        {/* Panel */}
        <div className="relative w-full max-w-lg bg-card rounded-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-heading text-base font-bold text-foreground">Share this post</p>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </button>
          </div>

          {/* Post preview — shows cover image + title so they know what they're sharing */}
          <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <HugeiconsIcon icon={Share08Icon} className="h-5 w-5 text-primary" />
              </div>
            )}
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{title}</p>
          </div>

          {/* Share options */}
          <div className="grid grid-cols-4 gap-3 px-5 py-5">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleShare(opt)}
                className="flex flex-col items-center gap-2"
              >
                <span className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105",
                  opt.bg
                )}>
                  {opt.icon}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Copy link */}
          <div className="border-t border-border px-5 pb-6 pt-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Or copy link
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5">
              <HugeiconsIcon icon={Link05Icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-muted-foreground">{url}</span>
              <button
                onClick={copyLink}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  copied
                    ? "bg-green-500/10 text-green-600"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {copied ? <span className="flex items-center gap-1"><HugeiconsIcon icon={Tick02Icon} className="h-3 w-3" />Copied</span> : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Social Icons (inline SVG) ───────────────────────────────────────────── */

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

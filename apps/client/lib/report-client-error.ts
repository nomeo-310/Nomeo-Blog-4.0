"use client";

/** Derives a stable-ish grouping key from a message when there's no error.digest. */
function slugifyMessage(message: string): string {
  return message
    .trim()
    .slice(0, 80)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "UNKNOWN_ERROR";
}

/**
 * Reports a client-side error to POST /api/errors — used by error.tsx,
 * global-error.tsx, and the window-level error/unhandledrejection listener
 * in components/error-tracking.tsx. Uses sendBeacon when available since
 * errors often fire right as the page is unloading or crashing, where a
 * normal fetch can get dropped.
 *
 * Never throws — reporting a failure must not cause a second failure.
 */
export function reportClientError(error: unknown, url?: string): void {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown client error");
    const digest = (err as Error & { digest?: string }).digest;

    const payload = JSON.stringify({
      errorCode: digest || slugifyMessage(err.message),
      message: err.message.slice(0, 2000),
      stack: err.stack?.slice(0, 10000),
      url: url ?? (typeof window !== "undefined" ? window.location.href : undefined),
      clientContext: typeof navigator !== "undefined" ? { userAgent: navigator.userAgent } : undefined,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/errors", new Blob([payload], { type: "application/json" }));
    } else if (typeof fetch !== "undefined") {
      fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reporting itself must never throw.
  }
}

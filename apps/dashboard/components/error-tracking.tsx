"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

/**
 * ErrorTracking — mounted once in the root layout.
 *
 * error.tsx/global-error.tsx only catch errors thrown during React
 * rendering — not errors in event handlers, timers, or unhandled promise
 * rejections (Next's own docs call this out explicitly). This closes that
 * gap by listening at the window level, so a broader class of runtime
 * errors still gets reported to /api/errors instead of silently vanishing
 * into the console.
 */
export function ErrorTracking() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

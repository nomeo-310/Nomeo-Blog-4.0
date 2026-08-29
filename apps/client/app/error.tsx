"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorContent } from "@/components/features/error-content";
import { reportClientError } from "@/lib/report-client-error";

/**
 * app/error.tsx — the app-wide error boundary.
 *
 * Wraps every route segment under the root layout (page.js, nested
 * layout.js, loading.js, not-found.js) in a React error boundary — so any
 * uncaught render-time exception anywhere in the app falls back to this
 * instead of a blank white screen. It does NOT catch errors thrown by
 * app/layout.tsx itself; that's what app/global-error.tsx is for.
 *
 * Note: this Next.js version's error boundaries expose `unstable_retry`
 * (re-fetches and re-renders the boundary's children) alongside `reset` —
 * see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return <ErrorContent onRetry={() => unstable_retry()} />;
}

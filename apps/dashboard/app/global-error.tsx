"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Quicksand, Urbanist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ErrorContent } from "@/components/features/error-content";
import { reportClientError } from "@/lib/report-client-error";

/**
 * app/global-error.tsx — catches errors thrown by app/layout.tsx itself
 * (app/error.tsx can't; it only wraps what's below the root layout). This
 * REPLACES the entire root layout when active, so it defines its own
 * <html>/<body> and re-imports globals.css/fonts — nothing from
 * app/layout.tsx (providers, sidebar, etc.) is available here, deliberately:
 * this has to render even if something in that tree is what's broken.
 * `metadata`/`generateMetadata` exports aren't supported in this file.
 */

const urbanistHeading = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", display: "swap" });
const quicksandSans = Quicksand({ subsets: ["latin"], variable: "--font-quicksand", display: "swap" });

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en" className={cn("h-full", "antialiased", quicksandSans.variable, urbanistHeading.variable)}>
      <body className="min-h-full flex flex-col font-sans text-foreground bg-background">
        <ErrorContent onRetry={() => unstable_retry()} />
      </body>
    </html>
  );
}

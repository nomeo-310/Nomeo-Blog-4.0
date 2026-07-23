import NotFoundContent from "@/components/features/not-found-content";
import type { Metadata } from "next";

/**
 * app/not-found.tsx — Nomeo's custom 404.
 *
 * A thin Server Component wrapper. The auth-aware behaviour (logged-in users
 * get a "Back to dashboard" action, everyone else "Back home") lives in the
 * client component, since session is read client-side via authClient.
 */

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return <NotFoundContent />;
}
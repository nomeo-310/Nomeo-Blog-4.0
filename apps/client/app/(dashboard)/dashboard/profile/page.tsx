import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

/**
 * My Profile page — quick link to the public profile + a note about
 * where to edit it. The actual editing is in Settings.
 * Route: app/dashboard/profile/page.tsx
 */
export default async function DashboardProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // getCurrentUser() resolves username from the profile collection.
  // Fall back to a safe slug of their display name if somehow not set yet.
  const username =
    user.username ||
    (user.displayName ?? user.name ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <h2 className="font-heading text-2xl font-bold text-foreground">My profile</h2>

        <div className="rounded-2xl border border-border bg-card p-6">
          {/* Username chip */}
          {username && (
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              @{username}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your public profile is visible to everyone on Nomeo. It shows your bio,
            posts{user.role === "creator" ? ", your members-only lounge," : ""} and
            social links.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/profile/${username}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              View my profile <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Edit profile details
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
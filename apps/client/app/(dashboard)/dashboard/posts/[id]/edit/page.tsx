import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import EditPostPage from "@/components/pages/dashboard/posts/edit-post-page";

export const metadata: Metadata = {
  title: 'Edit Post',
}

/**
 * My Profile page — quick link to the public profile + a note about
 * where to edit it. The actual editing is in Settings.
 * Route: app/dashboard/profile/page.tsx
 */
export default async function DashboardProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardLayout>
      <EditPostPage/>
    </DashboardLayout>
    )
  }
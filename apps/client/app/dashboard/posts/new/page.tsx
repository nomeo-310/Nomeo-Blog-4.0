import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NewPostPage from "@/app-pages/dashboard/posts/new-post-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Create Post',
}

export default async function Connections() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  return (
    <DashboardLayout>
      <NewPostPage/>
    </DashboardLayout>
  )
}
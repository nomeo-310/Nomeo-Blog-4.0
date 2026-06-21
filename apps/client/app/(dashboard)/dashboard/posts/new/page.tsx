import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NewPostPage from "@/components/pages/dashboard/posts/new-post-page";

export const metadata: Metadata = {
  title: 'Create Post',
}

export default async function Connections() {

  return (
    <DashboardLayout>
      <NewPostPage/>
    </DashboardLayout>
  )
}
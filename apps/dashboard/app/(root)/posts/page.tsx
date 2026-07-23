import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import PostsPage from "@/app-pages/posts/posts-page";

export const metadata: Metadata = {
  title: 'Posts',
}

export default function Posts() {
  return (
    <DashboardLayout>
      <PostsPage/>
    </DashboardLayout>
  );
}

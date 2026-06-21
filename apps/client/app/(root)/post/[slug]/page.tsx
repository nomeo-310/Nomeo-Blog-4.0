// app/post/[slug]/page.tsx
import { Metadata } from "next";
import AppLayout from "@/components/features/app-layout";
import PostPage, { generateMetadata as postMetadata } from "@/components/pages/post/post-page";
import { getCurrentUser } from "@/lib/session";

interface PostRouteProps {
  params: Promise<{ slug: string }>;
}

// Re-export generateMetadata from the PostPage component file
export async function generateMetadata({ params }: PostRouteProps): Promise<Metadata> {
  return postMetadata({ params });
}

export default async function PostRoute({ params }: PostRouteProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!user} user={user ?? undefined}>
      <PostPage slug={slug} user={user} />
    </AppLayout>
  );
}
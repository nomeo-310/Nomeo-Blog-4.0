// app/profile/[username]/page.tsx
import { Metadata } from "next";
import AppLayout from "@/components/features/app-layout";
import ProfilePage, { generateMetadata as profileMetadata } from "@/app-pages/profile/profile-page";
import { getCurrentUser } from "@/lib/session";

interface ProfileRouteProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileRouteProps): Promise<Metadata> {
  return profileMetadata({ params });
}

export default async function ProfileRoute({ params }: ProfileRouteProps) {
  const { username } = await params;
  const user = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!user} user={user ?? undefined}>
      <ProfilePage username={username} viewer={user} />
    </AppLayout>
  );
}
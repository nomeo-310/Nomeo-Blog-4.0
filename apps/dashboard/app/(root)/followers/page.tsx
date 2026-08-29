import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import FollowersPage from "@/app-pages/followers/followers-page";

export const metadata: Metadata = {
  title: 'Followers',
}

export default function Followers() {
  return (
    <DashboardLayout>
      <FollowersPage/>
    </DashboardLayout>
  );
}

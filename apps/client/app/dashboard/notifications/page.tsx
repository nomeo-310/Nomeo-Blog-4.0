import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NotificationsPage from "@/app-pages/dashboard/notifications/notifications-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function Connections() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardLayout>
      <NotificationsPage/>
    </DashboardLayout>
  )
}
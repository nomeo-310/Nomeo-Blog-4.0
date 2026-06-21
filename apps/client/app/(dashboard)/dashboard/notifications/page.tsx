import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NotificationsPage from "@/components/pages/dashboard/notifications/notifications-page";

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function Connections() {

  return (
    <DashboardLayout>
      <NotificationsPage/>
    </DashboardLayout>
  )
}
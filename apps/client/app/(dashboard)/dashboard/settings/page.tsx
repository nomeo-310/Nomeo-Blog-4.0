import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import SettingsPage from "@/components/pages/dashboard/settings/settings-page";

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function Settings() {

  return (
    <DashboardLayout>
      <SettingsPage/>
    </DashboardLayout>
  )
}
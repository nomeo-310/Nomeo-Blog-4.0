import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import SettingsPage from "@/app-pages/dashboard/settings/settings-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function Settings() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardLayout>
      <SettingsPage/>
    </DashboardLayout>
  )
}
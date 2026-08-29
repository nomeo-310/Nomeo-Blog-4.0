import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import SettingsPage from "@/app-pages/settings/settings-page";

export const metadata: Metadata = {
  title: 'Settings',
}

export default function Settings() {
  return (
    <DashboardLayout>
      <SettingsPage/>
    </DashboardLayout>
  );
}

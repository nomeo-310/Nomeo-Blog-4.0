import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import ApplicationsPage from "@/app-pages/creator-applications/applications-page";

export const metadata: Metadata = {
  title: 'Creator applications',
}

export default function Applicants() {
  return (
    <DashboardLayout>
      <ApplicationsPage/>
    </DashboardLayout>
  );
}

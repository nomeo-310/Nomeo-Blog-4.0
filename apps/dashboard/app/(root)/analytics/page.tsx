import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import AnalyticsPage from "@/app-pages/analytics/analytics-page";

export const metadata: Metadata = {
  title: 'Analytics',
}

export default function Analytics() {
  return (
    <DashboardLayout>
      <AnalyticsPage/>
    </DashboardLayout>
  );
}
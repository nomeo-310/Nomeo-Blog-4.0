import DashboardLayout from "@/components/features/dashboard-layout";
import OverviewPage from "@/app-pages/overview/overview-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Overview',
}

export default function Home() {
  return (
    <DashboardLayout>
      <OverviewPage/>
    </DashboardLayout>
  );
}

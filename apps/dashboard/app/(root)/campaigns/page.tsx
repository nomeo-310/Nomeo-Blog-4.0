import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import CampaignsPage from "@/app-pages/campaigns/campaigns-page";

export const metadata: Metadata = {
  title: 'Campaigns',
}

export default function Campaigns() {
  return (
    <DashboardLayout>
      <CampaignsPage/>
    </DashboardLayout>
  );
}

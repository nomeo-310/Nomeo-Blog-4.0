import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import LoungesPage from "@/app-pages/lounges/lounges-page";

export const metadata: Metadata = {
  title: 'Lounges',
}

export default function Lounges() {
  return (
    <DashboardLayout>
      <LoungesPage/>
    </DashboardLayout>
  );
}

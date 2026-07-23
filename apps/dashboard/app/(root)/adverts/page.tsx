import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import AdvertsPage from "@/app-pages/adverts/adverts-page";

export const metadata: Metadata = {
  title: 'Adverts',
}

export default function Adverts() {
  return (
    <DashboardLayout>
      <AdvertsPage/>
    </DashboardLayout>
  );
}

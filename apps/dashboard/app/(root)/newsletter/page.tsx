import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import SubscribersPage from "@/app-pages/subscribers/subscribers-page";

export const metadata: Metadata = {
  title: 'Subscribers',
}

export default function Newsletter() {
  return (
    <DashboardLayout>
      <SubscribersPage/>
    </DashboardLayout>
  );
}

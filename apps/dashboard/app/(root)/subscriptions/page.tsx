import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import SubscriptionsPage from "@/app-pages/subscriptions/subscriptions-page";

export const metadata: Metadata = {
  title: 'Subscriptions',
}

export default function Subscriptions() {
  return (
    <DashboardLayout>
      <SubscriptionsPage/>
    </DashboardLayout>
  );
}

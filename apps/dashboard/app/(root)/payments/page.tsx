import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import PaymentsPage from "@/app-pages/payments/payments-page";

export const metadata: Metadata = {
  title: 'Payments',
}

export default function Payments() {
  return (
    <DashboardLayout>
      <PaymentsPage/>
    </DashboardLayout>
  );
}

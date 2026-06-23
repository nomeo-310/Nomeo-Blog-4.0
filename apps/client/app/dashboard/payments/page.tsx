import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import PaymentsPage from "@/components/pages/dashboard/payments/payments-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Payments',
}

export default async function Payments() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardLayout>
      <PaymentsPage/>
    </DashboardLayout>
  )
}
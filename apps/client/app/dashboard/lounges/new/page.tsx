import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NewLoungePage from "@/app-pages/dashboard/lounge/new-lounge-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'New Lounge',
}

export default async function NewLounge() {

  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <DashboardLayout>
      <NewLoungePage/>
    </DashboardLayout>
  )
}
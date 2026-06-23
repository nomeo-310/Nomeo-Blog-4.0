import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import ConnectionsPage from "@/components/pages/dashboard/connections/connections-page";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Connections',
}

export default async function Connections() {

    const user = await getCurrentUser();
    if (!user) redirect("/");

  return (
    <DashboardLayout>
      <ConnectionsPage/>
    </DashboardLayout>
  )
}
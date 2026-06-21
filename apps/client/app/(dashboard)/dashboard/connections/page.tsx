import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import ConnectionsPage from "@/components/pages/dashboard/connections/connections-page";

export const metadata: Metadata = {
  title: 'Connections',
}

export default async function Connections() {

  return (
    <DashboardLayout>
      <ConnectionsPage/>
    </DashboardLayout>
  )
}
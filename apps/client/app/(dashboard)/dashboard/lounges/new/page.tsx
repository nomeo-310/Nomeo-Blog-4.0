import { Metadata } from "next"
import DashboardLayout from "@/components/features/dashboard-layout";
import NewLoungePage from "@/components/pages/dashboard/lounge/new-lounge-page";

export const metadata: Metadata = {
  title: 'New Lounge',
}

export default async function Connections() {

  return (
    <DashboardLayout>
      <NewLoungePage/>
    </DashboardLayout>
  )
}
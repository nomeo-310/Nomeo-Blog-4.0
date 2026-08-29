import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import CreatorsPage from "@/app-pages/creators/creators-page";

export const metadata: Metadata = {
  title: 'Creators',
}

export default function Creators() {
  return (
    <DashboardLayout>
      <CreatorsPage/>
    </DashboardLayout>
  );
}

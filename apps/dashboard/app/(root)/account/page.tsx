import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import AccountPage from "@/app-pages/account/account-page";

export const metadata: Metadata = {
  title: 'My account',
}

export default function Account() {
  return (
    <DashboardLayout>
      <AccountPage/>
    </DashboardLayout>
  );
}

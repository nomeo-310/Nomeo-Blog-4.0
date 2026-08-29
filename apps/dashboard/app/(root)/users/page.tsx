import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import UsersPage from "@/app-pages/users/users-page";

export const metadata: Metadata = {
  title: 'Users',
}

export default function Users() {
  return (
    <DashboardLayout>
      <UsersPage/>
    </DashboardLayout>
  );
}

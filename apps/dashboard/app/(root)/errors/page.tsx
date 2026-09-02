import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import ErrorLogPage from "@/app-pages/errors/error-log-page";

export const metadata: Metadata = {
  title: 'Error log',
}

export default function Errors() {
  return (
    <DashboardLayout>
      <ErrorLogPage/>
    </DashboardLayout>
  );
}

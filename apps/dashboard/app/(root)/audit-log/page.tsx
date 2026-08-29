import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import AuditLogPage from "@/app-pages/audit-log/audit-log-page";

export const metadata: Metadata = {
  title: 'Audit log',
}

export default function AuditLog() {
  return (
    <DashboardLayout>
      <AuditLogPage/>
    </DashboardLayout>
  );
}

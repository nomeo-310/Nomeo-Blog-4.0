import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";
import AdminsPage from "@/app-pages/admins/admins-page";

export const metadata: Metadata = {
  title: 'Admins',
}

// AdminsPage reads a ?create=1 query param (from the top bar's "New admin"
// button) via useSearchParams — force-dynamic avoids the static-prerender
// Suspense requirement that would otherwise apply.
export const dynamic = 'force-dynamic';

export default function Admins() {
  return (
    <DashboardLayout>
      <AdminsPage/>
    </DashboardLayout>
  );
}

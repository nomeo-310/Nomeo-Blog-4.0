import AppLayout from "@/components/features/app-layout"
import MembershipPage from "@/app-pages/membership/membership-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Membership',
}

export default async function Membership() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <MembershipPage/>
    </AppLayout>
  )
}
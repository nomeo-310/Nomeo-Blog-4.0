import AppLayout from "@/components/features/app-layout";
import LoungesPage from "@/app-pages/lounge/lounges-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Lounges',
}

export default async function Lounge() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <LoungesPage/>
    </AppLayout>
  )
}
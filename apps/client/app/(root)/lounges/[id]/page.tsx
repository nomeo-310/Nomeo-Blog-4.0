import AppLayout from "@/components/features/app-layout";
import LoungeRoomPage from "@/components/pages/lounge/lounge-room-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Lounge Room',
}

export default async function Lounge() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <LoungeRoomPage/>
    </AppLayout>
  )
}
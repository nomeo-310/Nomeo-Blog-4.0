import AppLayout from "@/components/features/app-layout";
import MessagesPage from "@/components/pages/lounge/message-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Messages',
}

export default async function Message() {
  const loggedInUser = await getCurrentUser();

  if (!loggedInUser) {
    redirect('/')
  }
  
  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <MessagesPage/>
    </AppLayout>
  );
}
import AppLayout from "@/components/features/app-layout";
import DmConversationPage from "@/app-pages/lounge/dm-conversation-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Conversation',
}

export default async function Message() {
  const loggedInUser = await getCurrentUser();
  
  if (!loggedInUser) {
    redirect('/')
  }
  
  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <DmConversationPage/>
    </AppLayout>
  );
}
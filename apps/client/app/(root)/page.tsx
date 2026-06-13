import AppLayout from "@/components/features/app-layout";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Home',
}

export default async function Home() {
  const loggedInUser = await getCurrentUser();
  
  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      hello Home
    </AppLayout>
  );
}

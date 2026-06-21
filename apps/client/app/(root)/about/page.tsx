import AppLayout from "@/components/features/app-layout"
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next"
import AboutPage from "@/components/pages/about/about-page";

export const metadata: Metadata = {
  title: 'About Us',
}

export default async function About() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <AboutPage/>
    </AppLayout>
  )
}
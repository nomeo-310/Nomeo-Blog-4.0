import FaqPage from "@/components/pages/faqs/faq-page";
import AppLayout from "@/components/features/app-layout"
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'FAQs',
}

export default async function FAQs() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <FaqPage/>
    </AppLayout>
  )
}
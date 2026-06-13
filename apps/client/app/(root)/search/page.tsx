import AppLayout from "@/components/features/app-layout"
import SearchPage from "@/components/pages/search/search-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Search',
}

export default async function Search() {
  const loggedInUser = await getCurrentUser();

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <SearchPage/>
    </AppLayout>
  )
}
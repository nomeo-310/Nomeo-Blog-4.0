import AppLayout from "@/components/features/app-layout";
import { getCurrentUser } from "@/lib/session";
import { getTopWriters } from "@/lib/get-top-writers";
import { Metadata } from "next";
import WritersPage from "@/app-pages/writers/writers-page";

export const metadata: Metadata = {
  title: "Writers",
  description: "Discover QuilHub's top writers and their paid and free stories.",
};

export const dynamic = "force-dynamic";

export default async function Writers() {
  const [loggedInUser, writers] = await Promise.all([
    getCurrentUser(),
    getTopWriters(),
  ]);

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser}>
      <WritersPage writers={writers} />
    </AppLayout>
  );
}

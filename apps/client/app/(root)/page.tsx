import AppLayout from "@/components/features/app-layout";
import HomePage from "@/app-pages/home/home-page";
import { getCurrentUser } from "@/lib/session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Home',
}

interface HomeProps {
  searchParams: Promise<{
    q?: string | string[];
    cat?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const loggedInUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const queryParam = resolvedSearchParams.q;
  const query = Array.isArray(queryParam) ? queryParam[0] ?? "" : queryParam ?? "";

  return (
    <AppLayout isAuthenticated={!!loggedInUser} user={loggedInUser} >
      <HomePage
        searchParams={Promise.resolve({
          q: query,
          cat: Array.isArray(resolvedSearchParams.cat)
            ? resolvedSearchParams.cat[0]
            : resolvedSearchParams.cat,
          sort: Array.isArray(resolvedSearchParams.sort)
            ? resolvedSearchParams.sort[0]
            : resolvedSearchParams.sort,
          page: Array.isArray(resolvedSearchParams.page)
            ? resolvedSearchParams.page[0]
            : resolvedSearchParams.page,
        })}
        user={loggedInUser}
      />
    </AppLayout>
  );
}

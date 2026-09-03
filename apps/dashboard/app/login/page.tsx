import { Suspense } from "react";
import AdminLoginPage from "@/app-pages/login/admin-login-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Login',
}

const Login = () => {

  return (
    // AdminLoginPage reads callbackUrl via useSearchParams() (see
    // use-admin-login.ts) — that requires a Suspense boundary, otherwise
    // the whole page fails static prerendering at build time.
    <Suspense fallback={null}>
      <AdminLoginPage/>
    </Suspense>
  )
}

export default Login;
import AdminLoginPage from "@/app-pages/login/admin-login-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Login',
}

const Login = () => {
  
  return (
    <AdminLoginPage/>
  )
}

export default Login;
'use client'

import { ReactNode } from "react";
import Navbar from "./navigation";
import { userProps } from "../auth/nav-user-type";
import Footer from "./footer";

interface AppLayoutProps {
  children: ReactNode;
  isAuthenticated: boolean;
  user?: userProps;
  unreadNotifications?: number;
}

const AppLayout = ({ children, isAuthenticated, user, unreadNotifications = 0 }: AppLayoutProps) => {
  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated={isAuthenticated} user={user} unreadNotifications={unreadNotifications}/>

      <main className="container mx-auto px-4 sm:px-6">
        {children}
      </main>
      <Footer/>
    </div>
  );
};

export default AppLayout;
import type { Metadata } from "next";
import { Quicksand, Urbanist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "./provider/query-client-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ThemeWatcher } from "@/components/ui/theme-watcher";


const urbanistHeading = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

const quicksandSans = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    template: 'Dashboard | %s',
    default: 'Dashboard | Overview',
  },
};


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en" className={cn("h-full", "antialiased", quicksandSans.variable, urbanistHeading.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeWatcher/>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Toaster richColors />
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

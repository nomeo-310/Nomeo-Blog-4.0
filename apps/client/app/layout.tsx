import type { Metadata } from "next";
import { Quicksand, Urbanist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import QueryProvider from "@/provider/query-provider";
import ModalProvider from "@/provider/modal-provider";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Toaster } from "sonner";
import { getCurrentUser, needsOnboarding } from "@/lib/session";
import { getCuratedTopics } from "@/lib/get-curated-topics";
import OnboardingGate from "@/components/auth/onboarding-gate";
import { ConversationsPanel } from "@/components/pages/lounge/conversations-panel";

interface CuratedTopic {
  slug: string;
  label: string;
}

interface OnboardingDefaults {
  username?: string;
  displayName?: string;
}

interface RootLayoutProps {
  children: React.ReactNode;
}

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
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    template: "%s | Nomeo",
    default: "Nomeo | Long-form stories, worth your time",
  },
  description:
    "Nomeo is a home for long-form writing. Read in-depth stories from independent writers, follow the voices you love, and support them directly through a single subscription. Write, publish, and earn from the reader pool.",
  keywords: [
    "long-form writing",
    "blogging platform",
    "independent writers",
    "reader subscription",
    "creator earnings",
    "essays and stories",
    "follow writers",
    "publish online",
    "Nomeo",
  ],
  authors: [{ name: "Nomeo" }],
  creator: "Nomeo",
  publisher: "Nomeo Consults Inc.",
  applicationName: "Nomeo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Nomeo",
    title: "Nomeo | Long-form stories, worth your time",
    description:
      "Read in-depth stories from independent writers, follow the voices you love, and support them through a single subscription. Write, publish, and earn.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomeo | Long-form stories, worth your time",
    description:
      "A home for long-form writing. Read, follow, and support independent writers — or publish and earn from the reader pool.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "writing",
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const showOnboarding: boolean = await needsOnboarding();

  let topics: CuratedTopic[] = [];
  let defaults: OnboardingDefaults | undefined = undefined;
  let initialStepIndex: number = 0;

  const [t, user] = await Promise.all([getCuratedTopics(), getCurrentUser()]);

  if (showOnboarding) {
    topics = t;
    defaults = { username: user?.username, displayName: user?.displayName };
    initialStepIndex = user?.onboardingStep ?? 0;
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", quicksandSans.variable, urbanistHeading.variable)}
    >
      <body
        className="min-h-full flex flex-col font-sans text-foreground bg-background"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Toaster position="top-center" richColors />
            <ModalProvider />
            <ConversationsPanel currentUserId={user?.id} />
            <OnboardingGate
              needsOnboarding={showOnboarding}
              topics={topics}
              defaults={defaults}
              initialStepIndex={initialStepIndex}
            />
            {children}
            <ScrollToTop />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
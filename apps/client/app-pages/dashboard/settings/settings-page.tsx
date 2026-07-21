"use client";

import { useState, memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Notification02Icon, PaintBoardIcon, User03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { ProfileSettings } from "./settings-profile";
import { NotificationSettings } from "./settings-notifications";
import { AppearanceSettings } from "./settings-appearance";
import { AccountSettings } from "./settings-account";

/**
 * SettingsPage — dashboard settings, tabbed by section.
 *
 * Each tab (Profile, Notifications, Appearance, Account) is an independent
 * sub-component in this same folder, owning its own data fetching, form
 * state and submit handler — they don't share state with each other. This
 * file owns only the tab selection and top-level composition.
 *
 * Component: app-pages/dashboard/settings/settings-page.tsx
 * Route:     app/dashboard/settings/page.tsx
 */

type Tab = "profile" | "notifications" | "appearance" | "account";

const TabBar = memo(({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) => {
  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "profile",       icon: <HugeiconsIcon icon={User03Icon}    className="h-4 w-4" />, label: "Profile"       },
    { key: "notifications", icon: <HugeiconsIcon icon={Notification02Icon}    className="h-4 w-4" />, label: "Notifications" },
    { key: "appearance",    icon: <HugeiconsIcon icon={PaintBoardIcon} className="h-4 w-4" />, label: "Appearance"    },
    { key: "account",       icon: <HugeiconsIcon icon={Shield01Icon} className="h-4 w-4" />, label: "Account"       },
  ];
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
      {tabs.map(({ key, icon, label }) => (
        <button key={key} onClick={() => onChange(key)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            active === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
});
TabBar.displayName = "TabBar";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, preferences and account.</p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      {tab === "profile"       && <ProfileSettings />}
      {tab === "notifications" && <NotificationSettings />}
      {tab === "appearance"    && <AppearanceSettings />}
      {tab === "account"       && <AccountSettings />}
    </div>
  );
}

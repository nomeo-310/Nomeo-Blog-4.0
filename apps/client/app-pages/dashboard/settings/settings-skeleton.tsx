import { memo } from "react";

/** Loading placeholder shown while a settings tab's data is being fetched. */
export const SettingsSkeleton = memo(() => (
  <div className="grid gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_440px]">
    <div className="space-y-5 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-muted" />)}
    </div>
    <div className="h-72 rounded-2xl bg-muted animate-pulse lg:sticky lg:top-6 lg:self-start" />
  </div>
));
SettingsSkeleton.displayName = "SettingsSkeleton";

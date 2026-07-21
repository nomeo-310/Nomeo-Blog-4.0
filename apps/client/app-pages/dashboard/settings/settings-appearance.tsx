"use client";

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SaveIcon, Tick02Icon, Sun03Icon, Moon02Icon, ComputerIcon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettingsSkeleton } from "./settings-skeleton";
import { fetchSettings } from "./settings-format";

/** Appearance tab — theme and reading font size, with a live text preview. */
export function AppearanceSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn:  fetchSettings,
    staleTime: 0,
  });

  type Theme    = "light" | "dark" | "system";
  type FontSize = "sm" | "md" | "lg" | "xl";

  const [localPrefs, setLocalPrefs] = useState<{ theme?: Theme; fontSize?: FontSize } | null>(null);
  const prefs = useMemo(() => ({
    theme:    "system" as Theme,
    fontSize: "md"     as FontSize,
    ...(settings?.appearance ?? {}),
    ...(localPrefs ?? {}),
  }), [settings, localPrefs]);

  const fontSizeClassMap = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" } as const;
  const sampleTextCls   = fontSizeClassMap[prefs.fontSize as FontSize] ?? "text-sm";

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch("/api/settings", { appearance: prefs }),
    onSuccess: () => {
      toast.success("Appearance saved.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setLocalPrefs(null);
    },
    onError: () => toast.error("Couldn't save."),
  });

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {(["light","dark","system"] as const).map((t) => (
              <button key={t} onClick={() => setLocalPrefs(p => ({ ...(p ?? {}), theme: t }))}
                className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium capitalize transition-colors",
                  prefs.theme === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                <span className="text-2xl">{t === "light" ? <HugeiconsIcon icon={Sun03Icon} /> : t === "dark" ? <HugeiconsIcon icon={Moon02Icon}/> : <HugeiconsIcon icon={ComputerIcon}/>}</span>
                {t}
                {prefs.theme === t && <HugeiconsIcon icon={Tick02Icon} className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Reading font size</p>
          <div className="grid grid-cols-4 gap-3">
            {([["sm","Small"],["md","Medium"],["lg","Large"],["xl","X-Large"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setLocalPrefs(p => ({ ...(p ?? {}), fontSize: val }))}
                className={cn("rounded-xl border py-3 text-sm font-medium transition-colors",
                  prefs.fontSize === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
          {saving ? "Saving…" : "Save appearance"}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preview</p>
          <div className={cn("space-y-2 leading-relaxed text-foreground", sampleTextCls)}>
            <p className="font-heading font-bold">The art of writing clearly</p>
            <p className="text-muted-foreground">Good writing is clear thinking made visible. When you write with precision, your readers follow effortlessly.</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Size: {prefs.fontSize.toUpperCase()} · Theme: {prefs.theme}</p>
        </div>
      </div>
    </div>
  );
}

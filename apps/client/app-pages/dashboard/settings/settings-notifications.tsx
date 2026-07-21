"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SaveIcon } from "@hugeicons/core-free-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettingsSkeleton } from "./settings-skeleton";
import { fetchSettings } from "./settings-format";

/** Notifications tab — email and push notification preferences, saved together. */
export function NotificationSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn:  fetchSettings,
    staleTime: 0,
  });

  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean> | null>(null);

  const prefs: Record<string, boolean> = useMemo(
    () => ({ ...(settings?.notifications ?? {}), ...(localPrefs ?? {}) }),
    [settings, localPrefs]
  );

  const toggle = useCallback((key: string) => {
    setLocalPrefs(p => ({ ...(p ?? {}), [key]: !(prefs[key]) }));
  }, [prefs]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch("/api/settings", { notifications: prefs }),
    onSuccess: () => {
      toast.success("Notification preferences saved.");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setLocalPrefs(null);
    },
    onError: () => toast.error("Couldn't save. Try again."),
  });

  const groups = [
    {
      label: "Email notifications",
      desc:  "Sent to your registered email address.",
      items: [
        { key: "emailNewFollower",        label: "New follower",           hint: "When someone follows you" },
        { key: "emailFollowRequest",       label: "Follow requests",        hint: "When someone sends a connection request" },
        { key: "emailNewComment",          label: "Comments on my posts",   hint: "When someone comments on your writing" },
        { key: "emailCommentReply",        label: "Comment replies",        hint: "When someone replies to your comment" },
        { key: "emailNewPost",             label: "New posts",              hint: "When someone you follow publishes" },
        { key: "emailLoungeActivity",      label: "Lounge activity",        hint: "New messages in lounges you're in" },
        { key: "emailSubscriptionAlerts",  label: "Subscription alerts",    hint: "Membership and billing updates" },
        { key: "emailAccountAlerts",       label: "Account alerts",         hint: "Important account notices" },
      ],
    },
    {
      label: "Push notifications",
      desc:  "In-app bell notifications shown in real time.",
      items: [
        { key: "pushNewFollower",    label: "New follower",      hint: "In-app notification when followed" },
        { key: "pushFollowRequest",  label: "Follow requests",   hint: "In-app notification for requests" },
        { key: "pushNewComment",     label: "Comments",          hint: "In-app notification for comments" },
        { key: "pushCommentReply",   label: "Comment replies",   hint: "In-app notification for replies" },
        { key: "pushNewPost",        label: "New posts",         hint: "In-app notification for new posts" },
        { key: "pushLoungeMessage",  label: "Lounge messages",   hint: "In-app notification for lounge activity" },
        { key: "pushLoungeMention",  label: "Lounge mentions",   hint: "When someone @mentions you in a lounge" },
      ],
    },
  ];

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{group.label}</p>
              <p className="text-xs text-muted-foreground">{group.desc}</p>
            </div>
            {group.items.map(({ key, label, hint }) => (
              <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <button onClick={() => toggle(key)} role="switch" aria-checked={!!prefs[key]}
                  className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    prefs[key] ? "bg-primary" : "bg-muted")}>
                  <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    prefs[key] ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-4 w-4" />}
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About notifications</p>
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p><span className="font-semibold text-foreground">Email</span> — delivered to your inbox. Good for things you don't want to miss.</p>
            <p><span className="font-semibold text-foreground">Push</span> — appear in the bell icon while you're on the platform. Real-time and dismissable.</p>
            <p>Turn off any type individually without affecting the rest.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary">Note</p>
          <p className="mt-1 text-xs text-muted-foreground">Account alerts are always sent — they contain critical security information.</p>
        </div>
      </div>
    </div>
  );
}

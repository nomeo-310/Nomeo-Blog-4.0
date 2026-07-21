"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ViewIcon, ViewOffIcon, Cancel01Icon, Sparkles, User03Icon, CircleLock02Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Field, inputCls } from "./settings-field";
import { SettingsSkeleton } from "./settings-skeleton";
import { fetchProfile } from "./settings-format";
import { CreatorApplicationSection } from "./settings-creator-application";

function getPasswordStrength(pw: string): { score: number; label: string; tips: string[] } {
  if (!pw) return { score: 0, label: "", tips: [] };
  const tips: string[] = [];
  let score = 0;
  if (pw.length >= 8)            score++; else tips.push("At least 8 characters");
  if (/[A-Z]/.test(pw))          score++; else tips.push("At least one uppercase letter");
  if (/[0-9]/.test(pw))          score++; else tips.push("At least one number");
  if (/[^A-Za-z0-9]/.test(pw))  score++; else tips.push("At least one special character");
  return { score, label: ["", "Weak", "Fair", "Good", "Strong"][score] ?? "", tips };
}

function PwInput({
  label, placeholder, value, show, onChange, onToggleShow,
}: {
  label: string;
  placeholder: string;
  value: string;
  show: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShow: () => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value}
          onChange={onChange}
          className={cn(inputCls, "pr-10")} placeholder={placeholder} />
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4" /> : <HugeiconsIcon icon={ViewIcon} className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

/** Account tab — email, password change, creator application (readers only), and delete account. */
export function AccountSettings() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn:  fetchProfile,
    staleTime: 60_000,
  });

  const isOAuth  = profile?.isOAuth   ?? false;
  const provider = profile?.providerId ?? "credential";

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => getPasswordStrength(pwForm.next), [pwForm.next]);

  const changePassword = async () => {
    if (!pwForm.current)               { toast.error("Enter your current password."); return; }
    if (pwForm.next.length < 8)        { toast.error("New password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match."); return; }
    if (strength.score < 2)            { toast.error("Please choose a stronger password."); return; }
    setSaving(true);
    try {
      await api.post("/api/account/change-password", {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      toast.success("Password updated. Please log in again.");
      setPwForm({ current: "", next: "", confirm: "" });
      await authClient.signOut();
      router.push("/");
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Couldn't change password.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Email address</p>
          <p className="mt-1 text-sm text-foreground">{session?.user?.email ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">To change your email address, contact support.</p>
        </div>

        {isOAuth ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Password</p>
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-muted/30 p-4">
              <span className="text-xl">{provider === "google" ? "🔵" : "🔐"}</span>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">Signed in with {provider}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Password changes are managed through your {provider === "google" ? "Google account" : provider + " account"}.
                </p>
                {provider === "google" && (
                  <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Manage Google account →
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Change password</p>
            <PwInput label="Current password" placeholder="••••••••"
              value={pwForm.current} show={showPw.current}
              onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, current: !p.current }))} />
            <PwInput label="New password" placeholder="Min 8 characters"
              value={pwForm.next} show={showPw.next}
              onChange={(e) => setPwForm(p => ({ ...p, next: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, next: !p.next }))} />

            {pwForm.next.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors",
                      i < strength.score
                        ? strength.score <= 1 ? "bg-destructive" : strength.score === 2 ? "bg-yellow-500" : strength.score === 3 ? "bg-blue-500" : "bg-green-500"
                        : "bg-muted")} />
                  ))}
                </div>
                <p className={cn("text-xs font-medium",
                  strength.score <= 1 ? "text-destructive" : strength.score === 2 ? "text-yellow-600 dark:text-yellow-400" : strength.score === 3 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400")}>
                  {strength.label}
                </p>
                {strength.tips.length > 0 && (
                  <ul className="space-y-0.5">
                    {strength.tips.map(tip => (
                      <li key={tip} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3 text-destructive shrink-0" />{tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <PwInput label="Confirm new password" placeholder="••••••••"
              value={pwForm.confirm} show={showPw.confirm}
              onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              onToggleShow={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-destructive">Passwords don't match.</p>
            )}
            <button onClick={changePassword} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        )}

        {/* Creator application — readers can upgrade to creator */}
        {profile?.role === "user" && <CreatorApplicationSection />}

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <HugeiconsIcon icon={AlertCircleIcon} className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-heading text-base font-bold text-foreground">Delete account</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Permanently delete your account and all your data. This cannot be undone.</p>
              <button
                onClick={() => { if (!confirm("Are you absolutely sure? This cannot be undone.")) return; toast.error("Account deletion is managed by our support team. Contact us to proceed."); }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">
                Delete my account
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">

        {/* Role badge */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your account</p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              profile?.role === "creator"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {profile?.role === "creator" ? <HugeiconsIcon icon={Sparkles} className="h-3 w-3" /> : <HugeiconsIcon icon={User03Icon} className="h-3 w-3" />}
              {profile?.role === "creator" ? "Creator" : "Reader"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{session?.user?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            Member since{" "}
            {session?.user?.createdAt
              ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(session.user.createdAt))
              : "—"}
          </p>
          {profile?.role === "creator" && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              As a creator you can publish posts, manage subscribers and run a members lounge.
            </p>
          )}
          {profile?.role === "user" && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              You're a reader. Use the <span className="font-medium text-foreground">Become a creator</span> section below to apply for writing access.
            </p>
          )}
        </div>

        {/* Security tips — tailored to auth method */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Security tips</p>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            {isOAuth ? (
              <>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Your account is secured through {provider === "google" ? "Google" : provider}. No password is stored on Nomeo.</li>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Keep your {provider === "google" ? "Google" : provider} account secure — it controls access to Nomeo.</li>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon}className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Enable two-factor authentication on your {provider === "google" ? "Google" : provider} account for extra protection.</li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Use a unique password not shared with any other account.</li>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Include uppercase letters, numbers and symbols.</li>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Nomeo will never ask for your password.</li>
                <li className="flex items-start gap-1.5"><HugeiconsIcon icon={CircleLock02Icon} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />Changing your password signs you out everywhere — you'll need to log in again.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

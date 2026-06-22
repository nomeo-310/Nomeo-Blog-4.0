"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, ArrowLeft, X } from "lucide-react";
import { PasswordStrength, usePasswordValidation } from "@/components/ui/password-strength";
import { useAuth, formatName, validateName, BLOCKED_ACCOUNT_MESSAGES } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRedirectAfterLogin } from "@/hooks/use-redirect-after-login";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";
type AuthStep = "credentials" | "verify" | "reset-password-verify";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
  onOpenLegal: (which: "terms" | "privacy" | "data" | "guidelines") => void;
}

export default function AuthModal({ isOpen, onClose, mode, onSwitchMode, onOpenLegal }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const isSignIn = mode === "sign-in";
  const isForgot = mode === "forgot-password";

  const { isValid: isPasswordSecure } = usePasswordValidation(password);

  // All network calls + their loading/error come from the hook
  const auth = useAuth();
  const loading = auth.loading;
  const prevModeRef = useRef<AuthMode>(mode);


  const router = useRouter();
  const redirectAfterLogin = useRedirectAfterLogin();

  const clearErrors = () => {
    setEmailError(null);
    setFullNameError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setOtpError(null);
    setGeneralError(null);
  };

  // Reset state when the MODE changes (not on step changes — that would wipe
  // the OTP the moment we navigate to the verify step).
  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode === mode) return; // step changed, not mode — do nothing
    prevModeRef.current = mode;

    clearErrors();
    setOtp("");
    setStep("credentials"); // any mode switch returns to the first step

    // Exiting sign-up entirely → clear everything
    if (prevMode === "sign-up" && mode !== "sign-up") {
      setEmail("");
      setFullName("");
      setPassword("");
      setConfirmPassword("");
    } else if (mode === "forgot-password") {
      setPassword("");
      setConfirmPassword("");
    } else if (mode === "sign-in" && prevMode !== "sign-up") {
      setPassword("");
      setConfirmPassword("");
    }
  }, [mode]);

  // Tick the resend cooldown down to zero
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // Start a 45s cooldown whenever we land on an OTP step (a code was just sent)
  useEffect(() => {
    if (step === "verify" || step === "reset-password-verify") {
      setResendCooldown(45);
    }
  }, [step]);

  /* ── Per-mode copy + imagery ────────────────────────────────────── */
  const content = useMemo(() => {
    const map = {
      "sign-in": {
        image: "/images/image-1.jpg",
        sideTitle: "Welcome back.",
        sideDesc: "Pick up exactly where you left off. Your library is waiting.",
        eyebrow: "Welcome back",
        title: "Sign in to Nomeo.",
        desc: "Continue your journey into long-form stories.",
      },
      "sign-up": {
        image: "/images/image-3.jpg",
        sideTitle: "Join the fold.",
        sideDesc: "Where ideas find their readers. Long-form writing, worth your time.",
        eyebrow: "Create your account",
        title: "Join Nomeo.",
        desc: "Read, write, and support the writers you love.",
      },
      "forgot-password": {
        image: "/images/image-4.jpg",
        sideTitle: "Security first.",
        sideDesc: "It happens to the best of us. Let's get you back in.",
        eyebrow: "Password recovery",
        title: step === "reset-password-verify" ? "Secure your account." : "Reset password.",
        desc:
          step === "reset-password-verify"
            ? "Enter the code we sent alongside your new password."
            : "Enter your email to receive a verification code.",
      },
    };
    return map[mode];
  }, [mode, step]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("credentials");
      setEmail("");
      setFullName("");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setResendCooldown(0);
      setResending(false);
      clearErrors();
    }, 300);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ── Credentials submit (sign-in / sign-up / forgot) ────────────── */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim()) return setEmailError("Email is required.");
    if (!emailRegex.test(email)) return setEmailError("Enter a valid email address.");

    if (isSignUp) {
      const nameCheck = validateName(fullName);
      if (nameCheck !== true) return setFullNameError(nameCheck);
    }

    if (!isForgot) {
      if (!password) return setPasswordError("Password is required.");
      if (isSignUp && !isPasswordSecure) return setPasswordError("Password doesn't meet the requirements.");
      // Confirm password is required on sign-up
      if (isSignUp) {
        if (!confirmPassword) return setConfirmPasswordError("Please confirm your password.");
        if (password !== confirmPassword) return setConfirmPasswordError("Passwords do not match.");
      }
    }

    if (isForgot) {
      const res = await auth.forgotPassword(email);
      if (res.success) setStep("reset-password-verify");
      else setGeneralError(res.error || "Couldn't send the reset code.");
    } else if (isSignUp) {
      const res = await auth.signUp({ email, password, name: formatName(fullName) });
      if (res.success) {
        await auth.sendOtp(email, "email_verification");
        setStep("verify");
      } else {
        setGeneralError(res.error || "Couldn't create your account.");
      }
    } else {
      const res = await auth.signIn({ email, password });

      if (res.success) {
        toast.success("Welcome back!");
        handleClose();
        if (!redirectAfterLogin()) router.refresh();
        return;
      }

      // Unverified email → send a code and route to the verify step
      if (res.code === "EMAIL_NOT_VERIFIED") {
        await auth.sendOtp(email, "email_verification");
        setStep("verify");
        return;
      }

      // Blocked accounts (banned / suspended) → friendly message
      if (res.status === 403) {
        setGeneralError(
          BLOCKED_ACCOUNT_MESSAGES[res.error ?? ""] ||
            "Access denied. Please contact support if you believe this is a mistake."
        );
        return;
      }

      setGeneralError(res.error || "Invalid email or password.");
    }
  };

  /* ── Reset-password submit (OTP + new password) ─────────────────── */
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (otp.length !== 6) return setOtpError("Enter the 6-digit code.");
    if (!password) return setPasswordError("New password is required.");
    if (!isPasswordSecure) return setPasswordError("Password doesn't meet the requirements.");
    if (!confirmPassword) return setConfirmPasswordError("Please confirm your password.");
    if (password !== confirmPassword) return setConfirmPasswordError("Passwords do not match.");

    const res = await auth.resetPassword({ email, otp, newPassword: password });
    if (res.success) {
      toast.success("Password updated. Please sign in with your new password.");
      // Deliberately NOT auto-logging in — the user proves the new password
      // works by signing in. Refresh to clear any stale state, and signal the
      // app (via a URL flag) to reopen the sign-in modal after the reload.
      const url = new URL(window.location.href);
      url.searchParams.set("auth", "sign-in");
      window.location.assign(url.toString());
    } else {
      setOtpError(res.error || "Invalid code or the reset expired.");
    }
  };

  /* ── Sign-up email verification ─────────────────────────────────── */
  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (otp.length !== 6) return setOtpError("Enter the 6-digit code.");

    const res = await auth.verifyOtp(email, otp, "email_verification");
    if (res.success) {
      // Silently sign the user in with the credentials they just registered.
      // password is still in state from the sign-up step.
      const signedIn = await auth.signIn({ email, password });
      if (signedIn.success) {
        toast.success("Welcome to Nomeo!");
        handleClose();
        // Full navigation so the new session is picked up everywhere.
        window.location.assign("/onboarding");
      } else {
        // Verified but auto sign-in failed (rare) — send them to sign in manually.
        toast.success("Email verified. Please sign in.");
        onSwitchMode("sign-in");
      }
    } else {
      setOtpError(res.error || "Invalid code. Try again.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setOtpError(null);
    setResending(true);
    const purpose = step === "reset-password-verify" ? "password_reset" : "email_verification";
    const res =
      step === "reset-password-verify"
        ? await auth.forgotPassword(email) // re-sends the reset code
        : await auth.sendOtp(email, purpose);
    if (res.success) {
      setResendCooldown(45);
    } else {
      setOtpError(res.error || "Couldn't resend the code. Try again.");
    }
    setResending(false);
  };

  /** Shared resend row, used by both OTP steps */
  const ResendRow = () => (
    <p className="text-center text-sm text-muted-foreground">
      Didn't get the code?{" "}
      {resendCooldown > 0 ? (
        <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
      ) : (
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
      )}
    </p>
  );

  return (
    <Modal
      isOpen={isOpen}
      useSeparator={false}
      onClose={handleClose}
      size="2xl"
      showCloseButton={false}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
      customBodyClassName="!p-0 [&>div]:!p-0 overflow-hidden"
      customHeaderClassName="hidden"
      maxHeight
    >
      <div className="relative grid h-[580px] lg:h-[600px] xl:h-[650px] max-h-[85vh] grid-cols-1 md:grid-cols-2 overflow-hidden rounded-lg">
        {/* Floating close button — sits over the panels, top-right */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Left panel ──────────────────────────────────────────── */}
        <div className="relative hidden h-full w-full overflow-hidden rounded-l-lg md:block">
          <Image
            key={content.image}
            src={content.image}
            alt=""
            fill
            sizes="(max-width: 768px) 0px, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-primary/10" />
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-8">
            {/* Logo + wordmark — top-left */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo.webp"
                alt="Nomeo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
                priority
              />
              <span className="text-lg font-bold tracking-tight text-white">
                Nomeo
              </span>
            </div>

            {/* Tagline — bottom */}
            <div>
              <h2 className="font-heading text-3xl font-bold leading-tight text-white select-none">
                {content.sideTitle}
              </h2>
              <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-white/85 select-none">
                {content.sideDesc}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div className="flex h-full flex-col justify-start overflow-y-auto rounded-lg bg-card px-6 py-10 sm:px-10 md:rounded-l-none custom-scrollbar">
          {/* CREDENTIALS STEP */}
          {step === "credentials" && (
            <div className="my-auto w-full">
              {isForgot && (
                <button
                  type="button"
                  onClick={() => onSwitchMode("sign-in")}
                  className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
              )}

              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{content.eyebrow}</p>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-card-foreground">{content.title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{content.desc}</p>

              <form onSubmit={handleAuth} noValidate className="mt-7 space-y-4">
                {/* Full name — sign-up only */}
                {isSignUp && (
                  <div>
                    <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-card-foreground">
                      Full name
                    </label>
                    <Input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={(e) => setFullName(formatName(e.target.value))}
                      className={cn(
                        "h-10 w-full bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 md:h-11",
                        fullNameError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                      )}
                      placeholder="Ada Lovelace"
                    />
                    {fullNameError && <p className="mt-1 text-xs font-medium text-destructive">{fullNameError}</p>}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Email address
                  </label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "h-10 w-full bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 md:h-11",
                      emailError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                    )}
                    placeholder="you@example.com"
                  />
                  {emailError && <p className="mt-1 text-xs font-medium text-destructive">{emailError}</p>}
                </div>

                {/* Password */}
                {!isForgot && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-card-foreground">
                        Password
                      </label>
                      {isSignIn && (
                        <button
                          type="button"
                          onClick={() => onSwitchMode("forgot-password")}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(
                          "h-10 w-full bg-background px-3.5 pr-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 md:h-11",
                          passwordError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                        )}
                        placeholder={isSignUp ? "Create a password" : "Your password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordError && <p className="mt-1 text-xs font-medium text-destructive">{passwordError}</p>}
                    {isSignUp && <PasswordStrength password={password} className="mt-3.5" />}
                  </div>
                )}

                {/* Confirm password — sign-up only */}
                {isSignUp && (
                  <div>
                    <label htmlFor="auth-confirm" className="mb-1.5 block text-sm font-medium text-card-foreground">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Input
                        id="auth-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={cn(
                          "h-10 w-full bg-background px-3.5 pr-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 md:h-11",
                          confirmPasswordError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                        )}
                        placeholder="Re-enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPasswordError && <p className="mt-1 text-xs font-medium text-destructive">{confirmPasswordError}</p>}
                  </div>
                )}

                {generalError && <p className="text-sm text-destructive">{generalError}</p>}

                <Button type="submit" disabled={loading} className="h-10 w-full text-sm font-semibold md:h-11">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isForgot ? "Send code" : isSignUp ? "Create account" : "Sign in"}
                </Button>
              </form>

              {!isForgot && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <Button type="button" variant="outline" onClick={() => auth.signInWithGoogle()} disabled={loading} className="h-10 w-full gap-2.5 text-sm font-medium md:h-11">
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {isSignUp ? "Already have an account?" : "New to Nomeo?"}{" "}
                    <button
                      type="button"
                      onClick={() => onSwitchMode(isSignUp ? "sign-in" : "sign-up")}
                      className="font-medium text-primary hover:underline"
                    >
                      {isSignUp ? "Sign in" : "Create one"}
                    </button>
                  </p>
                </>
              )}

              {isSignUp && (
                <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                  By creating an account you agree to our{" "}
                  <button type="button" onClick={() => onOpenLegal("terms")} className="text-primary hover:underline">Terms of Service</button>,{" "}
                  <button type="button" onClick={() => onOpenLegal("privacy")} className="text-primary hover:underline">Privacy Policy</button>,{" "}
                  <button type="button" onClick={() => onOpenLegal("data")} className="text-primary hover:underline">Data Protection</button>, and{" "}
                  <button type="button" onClick={() => onOpenLegal("guidelines")} className="text-primary hover:underline">Community Guidelines</button>.
                </p>
              )}
            </div>
          )}

          {/* RESET-PASSWORD VERIFY STEP */}
          {step === "reset-password-verify" && (
            <div className="my-auto w-full">
              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Change email
              </button>

              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{content.eyebrow}</p>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-card-foreground">{content.title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{content.desc}</p>

              <form onSubmit={handlePasswordResetSubmit} noValidate className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">6-digit recovery code</label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                      <InputOTPGroup className="gap-2">
                        {[...Array(6)].map((_, i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className={cn(
                              "h-10 w-10 rounded-md border text-base font-semibold transition-all md:h-11 md:w-11",
                              otpError ? "border-destructive ring-destructive/20 focus:ring-2" : "border-border focus:ring-primary/25"
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {otpError && <p className="mt-2 text-center text-xs font-medium text-destructive">{otpError}</p>}
                </div>

                <div>
                  <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-card-foreground">New password</label>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "h-10 w-full bg-background px-3.5 pr-10 text-sm focus-visible:ring-2 md:h-11",
                        passwordError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                      )}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="mt-1 text-xs font-medium text-destructive">{passwordError}</p>}
                  <PasswordStrength password={password} className="mt-3.5" />
                </div>

                <div>
                  <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium text-card-foreground">Confirm new password</label>
                  <div className="relative">
                    <Input
                      id="reset-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "h-10 w-full bg-background px-3.5 pr-10 text-sm focus-visible:ring-2 md:h-11",
                        confirmPasswordError ? "border-destructive focus-visible:ring-destructive/20" : "border-border focus-visible:ring-primary/20"
                      )}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPasswordError && <p className="mt-1 text-xs font-medium text-destructive">{confirmPasswordError}</p>}
                </div>

                <Button type="submit" disabled={loading} className="h-10 w-full text-sm font-semibold md:h-11">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password & sign in
                </Button>

                <ResendRow />
              </form>
            </div>
          )}

          {/* SIGN-UP VERIFY STEP */}
          {step === "verify" && (
            <form onSubmit={handleVerifySignUp} noValidate className="my-auto w-full space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 2 of 2</p>
                <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-card-foreground">Verify your email.</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below.
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                  <InputOTPGroup className="gap-2">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className={cn(
                          "h-10 w-10 rounded-md border text-base font-semibold transition-all md:h-11 md:w-11",
                          otpError ? "border-destructive ring-destructive/20 focus:ring-2" : "border-border focus:ring-primary/25"
                        )}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {otpError && <p className="text-center text-xs font-medium text-destructive">{otpError}</p>}

              <Button type="submit" disabled={loading} className="h-10 w-full text-sm font-semibold md:h-11">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify and continue
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setStep("credentials")} className="text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
              </div>

              <ResendRow />
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
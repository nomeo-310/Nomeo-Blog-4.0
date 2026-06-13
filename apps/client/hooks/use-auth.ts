"use client";

import { authClient } from "@/lib/authClient";
import { useState, useCallback } from "react";

/**
 * useAuth
 * -------
 * Wraps every auth operation the AuthModal needs into one hook with shared
 * loading / error handling. Each method returns a typed result so the modal
 * can branch (advance a step, show an error, close) without touching fetch.
 *
 * Better Auth's own client handles sign-in, sign-up, and Google — those go
 * through `authClient`. The custom flows (forgot/reset password, OTP send/verify)
 * go through your route handlers under /api/auth/*.
 *
 * Every method resolves to { success, error?, message? } and NEVER throws,
 * so the caller can always read result.success.
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
  /** Better Auth error code, when present (e.g. "EMAIL_NOT_VERIFIED") */
  code?: string;
  /** HTTP status, when present (e.g. 403 for blocked accounts) */
  status?: number;
}

type OtpPurpose = "email_verification" | "password_reset" | "account_recovery" | "sensitive_action";

/** Messages for accounts blocked at sign-in (mirrors auth.ts APIError messages). */
export const BLOCKED_ACCOUNT_MESSAGES: Record<string, string> = {
  account_banned: "Your account has been banned. Please contact support.",
  account_suspended: "Your account has been suspended. Please contact support.",
  account_deactivated: "Your account has been deactivated. Contact support if this is a mistake.",
  account_scheduled_for_deletion: "This account is scheduled for deletion. Access has been revoked.",
};

/** Capitalize each word: "john  doe" → "John Doe". */
export function formatName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Validate a full name (2–3 words, letters/apostrophes/hyphens). */
export function validateName(name: string): string | true {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return "Enter your full name (first and last name).";
  if (words.length > 3) return "Name can't exceed 3 words.";
  for (const w of words) {
    if (w.length < 2) return "Each name part needs at least 2 characters.";
    if (!/^[a-zA-Z]+(?:['-][a-zA-Z]+)*$/.test(w))
      return "Name can only contain letters, apostrophes, and hyphens.";
  }
  return true;
}

async function postJson(url: string, body: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || "Something went wrong. Try again." };
    }
    return { success: true, message: data.message };
  } catch {
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /* ── Sign up (Better Auth) ─────────────────────────────────────────── */
  const signUp = useCallback(
    async (params: { email: string; password: string; name: string }): Promise<AuthResult> => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await authClient.signUp.email({
          email: params.email,
          password: params.password,
          name: params.name,
        });
        if (error) {
          const msg = error.message || "Could not create your account.";
          setError(msg);
          return { success: false, error: msg };
        }
        // Account created → a verification OTP should now be sent.
        return { success: true };
      } catch {
        const msg = "Could not create your account. Try again.";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* ── Sign in (Better Auth) ─────────────────────────────────────────── */
  const signIn = useCallback(
    async (params: { email: string; password: string }): Promise<AuthResult> => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await authClient.signIn.email({
          email: params.email,
          password: params.password,
        });
        if (error) {
          const msg = error.message || "Invalid email or password.";
          setError(msg);
          return { success: false, error: msg, code: error.code, status: error.status };
        }
        return { success: true };
      } catch {
        const msg = "Could not sign you in. Try again.";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* ── Continue with Google (Better Auth) ────────────────────────────── */
  const signInWithGoogle = useCallback(async (callbackURL = "/"): Promise<AuthResult> => {
    setError(null);
    try {
      // Redirects away — resolves only if it fails to start.
      await authClient.signIn.social({ provider: "google", callbackURL });
      return { success: true };
    } catch {
      const msg = "Could not connect to Google. Try again.";
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  /* ── Send / resend an OTP (custom route) ───────────────────────────── */
  const sendOtp = useCallback(
    async (email: string, type: OtpPurpose): Promise<AuthResult> => {
      setLoading(true);
      setError(null);
      const result = await postJson("/api/auth/send-otp", { email, type });
      if (!result.success && result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  /* ── Verify an OTP (custom route) ──────────────────────────────────── */
  const verifyOtp = useCallback(
    async (email: string, otp: string, type: OtpPurpose): Promise<AuthResult> => {
      setLoading(true);
      setError(null);
      const result = await postJson("/api/auth/verify-otp", { email, otp, type });
      if (!result.success && result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  /* ── Forgot password — sends reset code (custom route) ─────────────── */
  const forgotPassword = useCallback(async (email: string): Promise<AuthResult> => {
    setLoading(true);
    setError(null);
    const result = await postJson("/api/auth/forgot-password", { email });
    if (!result.success && result.error) setError(result.error);
    setLoading(false);
    return result;
  }, []);

  /* ── Reset password — verifies OTP + sets new password (custom route) ─ */
  const resetPassword = useCallback(
    async (params: { email: string; otp: string; newPassword: string }): Promise<AuthResult> => {
      setLoading(true);
      setError(null);
      const result = await postJson("/api/auth/reset-password", params);
      if (!result.success && result.error) setError(result.error);
      setLoading(false);
      return result;
    },
    []
  );

  return {
    loading,
    error,
    clearError,
    signUp,
    signIn,
    signInWithGoogle,
    sendOtp,
    verifyOtp,
    forgotPassword,
    resetPassword,
  };
}
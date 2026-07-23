"use client";

import { useState }         from "react";
import { useSearchParams }  from "next/navigation";
import { toast }            from "sonner";
import type { LoginStep }   from "./types";

export function useAdminLogin() {
  const [step,         setStep]         = useState<LoginStep>(1);
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [seedPhrase,   setSeedPhrase]   = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const searchParams = useSearchParams();

  /* ── Step 1: verify email + password ─────────────────────────────── */
  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) { setError("Email and password are required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/check", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials."); return; }
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify seed phrase + complete login ──────────────────── */
  const submitSeedPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const words = seedPhrase.trim().split(/\s+/);
    if (words.length < 12 || words.length > 16) {
      setError("Seed phrase must contain 12–16 words separated by spaces.");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, seedphrase: seedPhrase.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid seed phrase."); return; }

      toast.success("Welcome back, Admin.");

      // Full page navigation so the session cookie is re-read correctly
      // by middleware before the dashboard renders.
      const callbackUrl = searchParams?.get("callbackUrl") || "/";
      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep(1);
    setError("");
    setSeedPhrase("");
  };

  return {
    step,
    email, setEmail,
    password, setPassword,
    seedPhrase, setSeedPhrase,
    error,
    loading,
    submitCredentials,
    submitSeedPhrase,
    backToCredentials,
  };
}

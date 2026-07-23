"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Logo  from "@/public/images/logo.webp";
import { useAdminLogin }    from "./use-admin-login";
import { SecurityPanel }    from "./components/security-panel";
import { StepIndicator }    from "./components/step-indicator";
import { CredentialsStep }  from "./components/credentials-step";
import { SeedPhraseStep }   from "./components/seed-phrase-step";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    step,
    email, setEmail,
    password, setPassword,
    seedPhrase, setSeedPhrase,
    error,
    loading,
    submitCredentials,
    submitSeedPhrase,
    backToCredentials,
  } = useAdminLogin();

  return (
    <div className="min-h-screen flex bg-background">
      <SecurityPanel />

      {/* ── Right panel — login form ─────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-xl">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Image src={Logo} alt="Nomeo_Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-heading text-lg font-bold text-foreground">Nomeo Admin</span>
          </div>

          <StepIndicator step={step} />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <CredentialsStep
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPassword={showPassword}
                onToggleShowPassword={() => setShowPassword((v) => !v)}
                error={error}
                loading={loading}
                onSubmit={submitCredentials}
              />
            )}

            {step === 2 && (
              <SeedPhraseStep
                seedPhrase={seedPhrase} setSeedPhrase={setSeedPhrase}
                error={error}
                loading={loading}
                onSubmit={submitSeedPhrase}
                onBack={backToCredentials}
              />
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            Three-factor authentication enabled · All access is logged and audited
          </motion.p>
        </div>
      </div>
    </div>
  );
}

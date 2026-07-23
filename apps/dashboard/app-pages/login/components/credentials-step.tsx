"use client";

import { motion }         from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { HugeiconsIcon }  from "@hugeicons/react";
import { Mail01Icon, CircleLock02Icon as LockIcon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { FormError } from "./form-error";

export function CredentialsStep({
  email, setEmail,
  password, setPassword,
  showPassword, onToggleShowPassword,
  error, loading, onSubmit,
}: {
  email:                 string;
  setEmail:              (value: string) => void;
  password:              string;
  setPassword:           (value: string) => void;
  showPassword:          boolean;
  onToggleShowPassword:  () => void;
  error:                 string;
  loading:               boolean;
  onSubmit:              (e: React.FormEvent) => void;
}) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <FormError message={error} />

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
          <div className="relative">
            <HugeiconsIcon icon={Mail01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              placeholder="admin@nomeo.com"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
          <div className="relative">
            <HugeiconsIcon icon={LockIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={onToggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword
                ? <HugeiconsIcon icon={ViewOffSlashIcon} className="w-4 h-4" />
                : <HugeiconsIcon icon={ViewIcon}         className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit" disabled={loading}
          className="w-full h-11 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>
    </motion.div>
  );
}

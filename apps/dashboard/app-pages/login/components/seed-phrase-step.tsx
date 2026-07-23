"use client";

import { motion }         from "framer-motion";
import { Loader2 }        from "lucide-react";
import { HugeiconsIcon }  from "@hugeicons/react";
import { Key01Icon, ArrowLeft02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "./form-error";

export function SeedPhraseStep({
  seedPhrase, setSeedPhrase,
  error, loading, onSubmit, onBack,
}: {
  seedPhrase:    string;
  setSeedPhrase: (value: string) => void;
  error:         string;
  loading:       boolean;
  onSubmit:      (e: React.FormEvent) => void;
  onBack:        () => void;
}) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Security verification</h2>
        <p className="text-sm text-muted-foreground">Enter your seed phrase to complete sign-in</p>
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-primary leading-relaxed">
            <strong>Three-factor authentication:</strong> Your seed phrase is the final security layer.
            Never share it with anyone — Nomeo will never ask for it via email or chat.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <FormError message={error} />

        {/* Seed phrase textarea */}
        <div className="space-y-1.5">
          <Label htmlFor="seedPhrase" className="text-sm font-medium text-foreground">Seed phrase</Label>
          <div className="relative">
            <HugeiconsIcon icon={Key01Icon} className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <Textarea
              id="seedPhrase"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              className="pl-9 font-mono text-sm resize-none h-24"
              placeholder="apple mountain ocean star thunder forest crystal phoenix dragon shadow light ember"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            12–16 words separated by spaces (provided in your invitation email)
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            type="button" variant="outline"
            onClick={onBack}
            className="flex-1 h-11 rounded-full gap-1.5"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="w-4 h-4" /> Back
          </Button>
          <Button
            type="submit" disabled={loading}
            className="flex-1 h-11 rounded-full gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Access dashboard
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

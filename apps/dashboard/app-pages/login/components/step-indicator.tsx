"use client";

import { motion }         from "framer-motion";
import { HugeiconsIcon }  from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import type { LoginStep } from "../types";

export function StepIndicator({ step }: { step: LoginStep }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      <div className="flex items-center">
        {/* Step 1 */}
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
            step >= 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {step > 1
              ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" />
              : "1"}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Step 1</p>
            <p className="text-sm font-semibold text-foreground">Credentials</p>
          </div>
        </div>

        {/* Connector */}
        <div className="flex-1 h-px bg-border mx-4" />

        {/* Step 2 */}
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            2
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Step 2</p>
            <p className="text-sm font-semibold text-foreground">Verification</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

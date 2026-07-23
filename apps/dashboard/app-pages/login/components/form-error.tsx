"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon }           from "@hugeicons/react";
import { AlertCircleIcon }         from "@hugeicons/core-free-icons";

export function FormError({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

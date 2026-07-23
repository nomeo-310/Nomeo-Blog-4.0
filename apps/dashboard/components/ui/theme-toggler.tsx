"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";

export const ThemeToggler = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="p-2 rounded-lg w-9 h-9" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <HugeiconsIcon icon={Moon02Icon} size={20} />
        ) : (
          <HugeiconsIcon icon={Sun01Icon} size={20} />
        )}
      </motion.div>
    </motion.button>
  );
};
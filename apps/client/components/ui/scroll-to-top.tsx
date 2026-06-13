"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon, ArrowDown02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const pathname = usePathname();

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  // Track scroll position and progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxScroll = documentHeight - windowHeight;
      const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
      
      const isScrolled = scrollY > 300;
      const atBottom = Math.ceil(scrollY + windowHeight) >= documentHeight - 10;
      
      setIsVisible(isScrolled);
      setIsAtBottom(atBottom);
      setScrollProgress(progress);
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const smartScroll = () => {
    if (isAtBottom || scrollProgress > 70) {
      scrollToTop();
    } else {
      scrollToBottom();
    }
  };

  // Get progress ring color based on scroll position
  const getProgressRingColor = () => {
    if (isAtBottom || scrollProgress > 70) {
      return "stroke-primary/30 dark:stroke-primary/20"; // Track ring
    }
    return "stroke-primary/30 dark:stroke-primary/20";
  };

  const getProgressFillColor = () => {
    if (isAtBottom || scrollProgress > 70) {
      return "stroke-primary dark:stroke-primary"; // Fill ring
    }
    return "stroke-primary dark:stroke-primary";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div className="relative">
            {/* Progress Ring - Track */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className={getProgressRingColor()}
              />
              {/* Progress Ring - Fill */}
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - scrollProgress / 100)}`}
                className={cn(
                  "transition-all duration-300",
                  getProgressFillColor()
                )}
                strokeLinecap="round"
              />
            </svg>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={smartScroll}
              className="relative group"
              aria-label={isAtBottom || scrollProgress > 70 ? "Scroll to top" : "Scroll to bottom"}
            >
              {/* Glow effect using primary color */}
              <div className="absolute inset-0 bg-primary rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              
              {/* Main button with primary color */}
              <div className="relative bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-all duration-200">
                <motion.div
                  animate={{ rotate: isAtBottom || scrollProgress > 70 ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <HugeiconsIcon 
                    icon={isAtBottom || scrollProgress > 70 ? ArrowUp02Icon : ArrowDown02Icon} 
                    size={24} 
                  />
                </motion.div>
              </div>
              
              {/* Smart Tooltip */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-sm px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-md border border-border"
              >
                {isAtBottom || scrollProgress > 70 ? "Scroll to top" : "Scroll to bottom"}
              </motion.div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
"use client";

import { useEffect, useState } from "react";

/**
 * useScrollDirection
 * ------------------
 * Drives the "hide on scroll down, reveal on scroll up" navbar pattern.
 *
 * Returns `hidden`:
 *   - true  → user is scrolling DOWN (navbar should slide away)
 *   - false → user is scrolling UP, or near the top (navbar visible)
 */
export function useScrollDirection({
  threshold = 8,
  topOffset = 80,
}: { threshold?: number; topOffset?: number } = {}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;

      // Always show near the top of the page
      if (currentY < topOffset) {
        setHidden(false);
        lastY = currentY;
        ticking = false;
        return;
      }

      const diff = currentY - lastY;

      // Ignore tiny movements (jitter / trackpad noise)
      if (Math.abs(diff) >= threshold) {
        setHidden(diff > 0); // scrolling down → hide; up → show
        lastY = currentY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return hidden;
}
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Ensures each page starts from top when navigating.
 * Handles both window scrolling and any nested scroll containers that opt-in.
 */
export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    // 1) Default window scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }

    // 2) Optional nested scroll containers (opt-in via data attribute)
    const nodes = document.querySelectorAll('[data-scroll-reset="true"]');
    nodes.forEach((el) => {
      try {
        el.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
  }, [pathname]);

  return null;
}


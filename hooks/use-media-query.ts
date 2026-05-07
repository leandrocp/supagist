"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * `defaultValue` is the value used during SSR and the first client render
 * before `matchMedia` settles. Default to `true` for queries like
 * `(min-width: 768px)` so desktop users see the desktop variant immediately
 * — mobile users still get a one-frame flash, but desktop users (the
 * common case) see the centred Dialog from the start instead of the
 * slide-up Drawer.
 */
export function useMediaQuery(query: string, defaultValue: boolean = true): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

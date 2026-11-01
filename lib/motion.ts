/**
 * Shared motion helpers. Motion is CSS keyframes (app/globals.css) plus the
 * Web Animations API for one-off exits; no animation library.
 *
 * Every helper respects `prefers-reduced-motion`: callers get `null` (no
 * animation) and act immediately, so motion never delays an action.
 */

/** sessionStorage key the composer sets right before it navigates to a new snippet. */
export const JUST_PUBLISHED_KEY = "supagist:just-published";

/** A publish older than this is stale (e.g. a tab restored later): no stamp. */
const JUST_PUBLISHED_MAX_AGE_MS = 60_000;

export type JustPublished = {
  /** The snippet path, e.g. `/hello-ts-abc123`. */
  path: string;
  /** Whether the composer managed to copy the link to the clipboard. */
  copied: boolean;
};

/** Remember that `path` was just published, so its page plays the stamp once. */
export function markJustPublished(path: string, copied: boolean): void {
  try {
    window.sessionStorage.setItem(
      JUST_PUBLISHED_KEY,
      JSON.stringify({ path, copied, at: Date.now() }),
    );
  } catch {
    // Storage can be unavailable (private mode quotas); the stamp is optional.
  }
}

/**
 * Read and clear the just-published marker for `path`. Returns null when the
 * marker is missing, malformed, stale or for another snippet, so a reload or
 * a later visit never replays the stamp.
 */
export function takeJustPublished(path: string, now = Date.now()): JustPublished | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(JUST_PUBLISHED_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const marker = parsed as { path?: unknown; copied?: unknown; at?: unknown } | null;
  if (
    !marker ||
    typeof marker.path !== "string" ||
    typeof marker.at !== "number" ||
    now - marker.at > JUST_PUBLISHED_MAX_AGE_MS ||
    now < marker.at
  ) {
    window.sessionStorage.removeItem(JUST_PUBLISHED_KEY);
    return null;
  }
  // Another snippet's marker stays put: its own page may still be loading.
  if (marker.path !== path) return null;

  window.sessionStorage.removeItem(JUST_PUBLISHED_KEY);
  return { path: marker.path, copied: marker.copied === true };
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Play a Web Animation unless motion is reduced or unsupported. Returns the
 * Animation, or null when nothing plays (act immediately in that case).
 */
export function play(
  element: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!element || typeof element.animate !== "function" || prefersReducedMotion()) return null;
  return element.animate(keyframes, options);
}

/** Shrink-and-fade used when a reaction chip goes away. */
export const CHIP_EXIT: Keyframe[] = [
  { opacity: 1, transform: "scale(1)" },
  { opacity: 0, transform: "scale(0.6)" },
];

/**
 * Run `action` after `element` plays its exit, or right away when there is
 * nothing to animate. The exit is short (≤ 200 ms) so the action is not held up.
 */
export function exitThen(
  element: Element | null | undefined,
  action: () => void,
  keyframes: Keyframe[] = CHIP_EXIT,
  duration = 160,
): void {
  const animation = play(element, keyframes, { duration, easing: "ease-in", fill: "forwards" });
  if (!animation) {
    action();
    return;
  }
  animation.finished.then(action, action);
}

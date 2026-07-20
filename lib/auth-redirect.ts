/**
 * Returns a safe in-app redirect target — guards against open-redirect by
 * rejecting anything that isn't a same-origin relative path. Used by the
 * post-login callback (`/auth/oauth`) and by the login form to round-trip the
 * page the user came from.
 */
const SAFE_REDIRECT_ORIGIN = "https://supagist.invalid";

function hasUnsafeRedirectCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (character === "\\" || codePoint === undefined || codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }
  return false;
}

export function safeNextPath(value: string | null | undefined, fallback: string = "/"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/") || hasUnsafeRedirectCharacter(value)) return fallback;

  try {
    // URL parsing, rather than string-prefix checks, catches authority-path
    // variants such as `///evil.com` and browser-normalized backslashes.
    const resolved = new URL(value, SAFE_REDIRECT_ORIGIN);
    return resolved.origin === SAFE_REDIRECT_ORIGIN ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Build the login URL for a given current pathname so the user is returned to
 * where they were after signing in. The login page is the identity for the
 * fallback ("/" doesn't carry a `next`, since that's the default after-login
 * destination already).
 */
export function buildLoginUrl(currentPath: string | null | undefined): string {
  const next = safeNextPath(currentPath, "/");
  if (next === "/" || next === "/auth/login") return "/auth/login";
  return `/auth/login?next=${encodeURIComponent(next)}`;
}

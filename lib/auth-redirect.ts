/**
 * Returns a safe in-app redirect target — guards against open-redirect by
 * rejecting anything that isn't a same-origin relative path. Used by the
 * post-login callback (`/auth/oauth`) and by the login form to round-trip the
 * page the user came from.
 */
export function safeNextPath(value: string | null | undefined, fallback: string = "/"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  // Must start with a single `/` and not be a protocol-relative URL like `//evil.com`.
  if (value[0] !== "/" || value.startsWith("//")) return fallback;
  // Reject anything containing a scheme (defensive against `/\/evil.com` etc.).
  if (value.includes(":")) return fallback;
  return value;
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

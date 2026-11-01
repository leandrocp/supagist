import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // Production links and share images use the public domain, not the
  // per-deployment hostname; preview deployments keep their own URL.
  const host =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export function getMetadataBase(): URL {
  try {
    return new URL(getAppUrl());
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function getRequestOrigin(headers: Pick<Headers, "get">) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return getAppUrl();

  const proto =
    headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export function buildAppUrl(path: string, origin: string = getAppUrl()) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, origin).toString();
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isConfiguredSupabaseKey(value: string | undefined) {
  if (!value) return false;
  return value.trim() !== "your-publishable-or-anon-key";
}

export const hasEnvVars =
  isHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  isConfiguredSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

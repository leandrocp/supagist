import type { NextConfig } from "next";

// Read at request time by lib/snippet-render.ts.
const SNIPPET_RENDER_FILES = [
  "./supabase/functions/mcp/assets/*.ttf",
  "./assets/og/fonts/NotoEmoji.ttf",
  "./public/brands/**/*",
];

export function buildContentSecurityPolicy(environment: string | undefined): string {
  const isProduction = environment === "production";
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    ...(!isProduction
      ? ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"]
      : []),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    isProduction
      ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const contentSecurityPolicy = buildContentSecurityPolicy(process.env.NODE_ENV);

export const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS: Vercel sets this automatically on prod domains, but specifying it
  // here keeps behavior consistent across hosts.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lumis's Node entry loads its native addon with a runtime `require`, which
  // bundlers cannot place; Node must load the package itself
  // (leandrocp/lumis#1589).
  // resvg (PNG for /api/render) is a native addon too.
  // The parser bundle stays external so server routes that import the export
  // renderer (the share image, the live thumbnail) don't also get Turbopack's
  // copy of every parser, which put them over Vercel's 250 MB limit.
  serverExternalPackages: ["@lumis-sh/lumis", "@resvg/resvg-js", "@lumis-sh/wasm-bundle-full"],
  // It also finds the installed @lumis-sh/wasm-* parsers at runtime, from the
  // project directory, which file tracing cannot follow. Without these the
  // deployed saved view would fall back to plain text for every snippet.
  outputFileTracingIncludes: {
    "/\\[snippet\\]": ["./node_modules/@lumis-sh/wasm-*/**/*"],
    // The share image reads its fonts, envelope layers and Noto emoji at
    // request time (lib/og-render.tsx). It and the live thumbnail also render
    // snippets with no stored image using the TTF faces and brand images
    // (lib/snippet-render.ts).
    "/\\[snippet\\]/og.png": ["./assets/og/**/*", ...SNIPPET_RENDER_FILES],
    "/\\[snippet\\]/image.png": SNIPPET_RENDER_FILES,
    // Read at request time; see lib/google-connected-apps.ts.
    "/.well-known/google-connected-apps": ["./google-connected-apps.json"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

export function buildContentSecurityPolicy(environment: string | undefined): string {
  const isProduction = environment === "production";
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://cdn.jsdelivr.net",
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

/**
 * `/auth/cli` posts the session to a loopback listener the CLI opened, so that
 * one route needs `connect-src` widened to 127.0.0.1. It is scoped to this path
 * rather than added globally: no other page should be able to talk to processes
 * on the visitor's machine.
 */
export function buildCliAuthContentSecurityPolicy(environment: string | undefined): string {
  return buildContentSecurityPolicy(environment).replace(
    /(connect-src [^;]*)/,
    "$1 http://127.0.0.1:* http://localhost:*",
  );
}

const contentSecurityPolicy = buildContentSecurityPolicy(process.env.NODE_ENV);
const cliAuthContentSecurityPolicy = buildCliAuthContentSecurityPolicy(process.env.NODE_ENV);

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
  // resvg is a native addon and wawoff2 ships its own WASM loader; neither can
  // be placed in an ESM chunk. Require them at runtime instead of bundling.
  serverExternalPackages: ["@resvg/resvg-js", "wawoff2"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  // `public/` is read at request time by the CLI publish renderer (fonts and
  // brand artwork), which the bundle tracer cannot infer from a dynamic path.
  outputFileTracingIncludes: {
    "/api/cli/publish": ["./public/fonts/**", "./public/brands/**"],
  },
  async headers() {
    return [
      // More specific first: Next applies the first matching header set per key.
      {
        source: "/auth/cli",
        headers: [
          ...securityHeaders.filter((header) => header.key !== "Content-Security-Policy"),
          { key: "Content-Security-Policy", value: cliAuthContentSecurityPolicy },
        ],
      },
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;

import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { renderInput } from "../mcp/input.ts";
import { RATE_LIMITS, UNLIMITED_USER_ID, rateLimitMessage } from "../mcp/rate-limit.ts";

// Public render API for the CLI (#7). Renders and lists options only: nothing
// is published, stored or shared. The input schema, 30-row limit, renderer and
// quota sizes are the MCP's; buckets are separate so CLI and MCP use do not mix.

export const MAX_BODY_BYTES = 256 * 1024;

type RateLimitAdmin = {
  rpc(
    name: "check_rate_limit",
    args: { p_key: string; p_max: number; p_window: string },
  ): PromiseLike<{ data: unknown; error: unknown }>;
};

export type Context = {
  jwtClaims: object | null;
  userClaims: { id: string } | null;
  supabaseAdmin: RateLimitAdmin;
};

export type Deps = {
  verifyProxyToken(token: string): Promise<boolean>;
  render(input: unknown): Promise<{ svg: string; width: number; height: number }>;
  options(): Promise<unknown>;
  isInputError(error: unknown): Promise<boolean>;
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const failure = (status: number, code: string, message: string, extra?: object) =>
  json(status, { error: { code, message, ...extra } });

// The Vercel proxy (supagist.app/api/*) sends the caller's IP with the
// deployment's OIDC token. Only that pairing is trusted. A caller's own
// X-Forwarded-For survives Cloudflare, so it would mint a fresh bucket per request.
export async function clientIp(req: Request, verifyProxyToken: Deps["verifyProxyToken"]) {
  const forwarded = req.headers.get("x-supagist-client-ip")?.trim();
  const token = req.headers.get("x-supagist-proxy-token");
  if (forwarded && token && (await verifyProxyToken(token))) return forwarded;
  return (
    req.headers.get("cf-connecting-ip")?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown"
  );
}

// Charge every bucket, denied attempts included, through the atomic RPC.
async function charge(admin: RateLimitAdmin, buckets: { key: string; limits: Limits }[]) {
  const checks = await Promise.all(
    buckets.flatMap(({ key, limits }) =>
      (["minute", "day"] as const).map(async (window) => {
        const seconds = RATE_LIMITS.windows[window];
        const { data, error } = await admin.rpc("check_rate_limit", {
          p_key: `${key}:${window === "minute" ? "m" : "d"}`,
          p_max: limits[window],
          p_window: `${seconds} seconds`,
        });
        if (error || typeof data !== "boolean") throw new Error("Rate limit RPC failed");
        return data ? 0 : seconds;
      }),
    ),
  );
  return Math.max(0, ...checks);
}
type Limits = { minute: number; day: number };

export async function handleRequest(req: Request, ctx: Context, deps: Deps): Promise<Response> {
  // Anonymous Auth sessions are free to mint, so they would bypass IP limits.
  if ((ctx.jwtClaims as { is_anonymous?: unknown } | null)?.is_anonymous === true) {
    return failure(403, "FORBIDDEN", "Sign in with a persistent account, or send no token.");
  }
  const route = new URL(req.url).pathname.split("/").filter(Boolean).slice(1).join("/");
  if (route !== "" && route !== "options") return failure(404, "NOT_FOUND", "Unknown endpoint.");
  const method = route === "options" ? "GET" : "POST";
  if (req.method !== method) {
    return json(
      405,
      { error: { code: "METHOD_NOT_ALLOWED", message: `Use ${method}.` } },
      { Allow: method },
    );
  }

  let body = "";
  if (method === "POST") {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return failure(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 256 KB.");
    }
    body = await req.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return failure(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 256 KB.");
    }
  }

  const ip = await clientIp(req, deps.verifyProxyToken);
  const userId = ctx.userClaims?.id;
  const render = method === "POST";
  // Same sizes as the MCP: an IP backstop plus a render quota, per verified
  // user when a token is sent, otherwise per IP.
  const buckets =
    userId === UNLIMITED_USER_ID
      ? []
      : userId
        ? [
            { key: `api:ip:${ip}:user:${userId}`, limits: RATE_LIMITS.ip },
            { key: `api:user:${userId}`, limits: RATE_LIMITS.user },
            ...(render ? [{ key: `api:render:user:${userId}`, limits: RATE_LIMITS.render }] : []),
          ]
        : [
            { key: `api:ip:${ip}`, limits: RATE_LIMITS.ip },
            ...(render ? [{ key: `api:render:ip:${ip}`, limits: RATE_LIMITS.render }] : []),
          ];
  let retryAfter: number;
  try {
    retryAfter = await charge(ctx.supabaseAdmin, buckets);
  } catch {
    // Never render for free if the limiter is unavailable.
    return failure(503, "RATE_LIMIT_UNAVAILABLE", "Rate limit service unavailable.");
  }
  if (retryAfter) {
    return json(
      429,
      { error: { code: "RATE_LIMITED", message: rateLimitMessage(retryAfter), retryAfter } },
      { "Retry-After": String(retryAfter) },
    );
  }

  if (!render) return json(200, await deps.options(), { "Cache-Control": "public, max-age=300" });

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return failure(400, "INVALID_JSON", "Send a JSON object with at least a code field.");
  }
  const parsed = renderInput.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const message = issues.map((issue) => `${issue.path || "input"}: ${issue.message}`).join("; ");
    return failure(400, "INVALID_INPUT", message, { issues });
  }
  // PNG rasterizes on Vercel Node (supagist.app/api/render), never on Edge.
  if (parsed.data.format === "png") {
    return failure(400, "INVALID_INPUT", "format: this endpoint renders SVG only", {
      issues: [{ path: "format", message: "this endpoint renders SVG only" }],
    });
  }
  try {
    const { svg, width, height } = await deps.render(raw);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Supagist-Width": String(width),
        "X-Supagist-Height": String(height),
      },
    });
  } catch (error) {
    if (await deps.isInputError(error))
      return failure(400, "INVALID_INPUT", (error as Error).message);
    console.error(JSON.stringify({ event: "render-failed", message: String(error) }));
    return failure(500, "RENDER_FAILED", "Rendering failed. Try again later.");
  }
}

// Vercel OIDC identifiers for the supagist project. Not secrets: the token's
// signature is what proves the request came through the deployment.
const VERCEL_TEAM = "leandrocp";
const VERCEL_OWNER_ID = "team_7pZt004uSZrUUnPsN3JHYCJ9";
const VERCEL_PROJECT_ID = "prj_huDk54Gq6WWfy2vVUrHFBuv8sTIy";
// Team and global issuer modes; the project setting picks one.
const issuers = new Map(
  [`https://oidc.vercel.com/${VERCEL_TEAM}`, "https://oidc.vercel.com"].map((issuer) => [
    issuer,
    createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`)),
  ]),
);

export async function verifyVercelProxyToken(token: string): Promise<boolean> {
  try {
    const issuer = decodeJwt(token).iss;
    const keys = issuer && issuers.get(issuer);
    if (!keys) return false;
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: `https://vercel.com/${VERCEL_TEAM}`,
    });
    return payload.owner_id === VERCEL_OWNER_ID && payload.project_id === VERCEL_PROJECT_ID;
  } catch {
    return false;
  }
}

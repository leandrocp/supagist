export const RATE_LIMIT_MESSAGE = "Rate limit reached. Need more? Contact supagist@leandro.io";

export const RATE_LIMITS = {
  user: { minute: 15, day: 500 },
  render: { minute: 5, day: 50 },
  ip: { minute: 30, day: 1000 },
  windows: { minute: 60, day: 86400 },
} as const;

type RateLimitAdmin = {
  rpc(
    name: "check_rate_limit",
    args: { p_key: string; p_max: number; p_window: string },
  ): PromiseLike<{ data: unknown; error: unknown }>;
};

// Run after verified persistent-user auth, before constructing the MCP handler.
// Discovery/preflight and rejected auth never dispatch tools or consume user quotas.
export async function enforceRateLimits(
  req: Request,
  userId: string,
  admin: RateLimitAdmin,
): Promise<Response | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  // Inspect the same JSON-RPC method/name the SDK dispatches, not client headers.
  const message =
    req.method === "POST"
      ? await req
          .clone()
          .json()
          .catch(() => null)
      : null;
  const toolCall = message?.method === "tools/call";
  const buckets = [
    { key: `mcp:user:${userId}`, limits: RATE_LIMITS.user },
    { key: `mcp:ip:${ip}`, limits: RATE_LIMITS.ip },
    ...(toolCall && message.params?.name === "render_snippet"
      ? [{ key: `mcp:render:${userId}`, limits: RATE_LIMITS.render }]
      : []),
  ];

  try {
    // Charge every applicable bucket, including denied attempts. Each RPC is
    // atomic; no process-local state or read-then-write race across isolates.
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
    const retryAfter = Math.max(...checks);
    if (!retryAfter) {
      // The SDK's legacy transport accepts batches. Reject them explicitly so
      // one HTTP request cannot dispatch many renders for one quota charge.
      if (Array.isArray(message)) {
        return Response.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Send one MCP request at a time; batches are not supported.",
            },
          },
          { status: 400 },
        );
      }
      return null;
    }

    const id =
      typeof message?.id === "string" || typeof message?.id === "number" ? message.id : null;
    return Response.json(
      toolCall
        ? {
            jsonrpc: "2.0",
            id,
            result: { isError: true, content: [{ type: "text", text: RATE_LIMIT_MESSAGE }] },
          }
        : { jsonrpc: "2.0", id, error: { code: -32000, message: RATE_LIMIT_MESSAGE } },
      {
        status: 429,
        // The existing RPC exposes no start/reset time. A full window is a
        // conservative upper bound, not a fabricated aligned-bucket reset.
        headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
      },
    );
  } catch {
    // Never render for free if the limiter/database is unavailable.
    return Response.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }
}

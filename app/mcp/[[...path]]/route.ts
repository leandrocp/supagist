type Context = { params: Promise<{ path?: string[] }> };

async function handle(request: Request, context: Context): Promise<Response> {
  const { path = [] } = await context.params;
  const metadata = path.length === 1 && path[0] === "oauth-protected-resource";
  if (path.length && !metadata) return new Response(null, { status: 404 });

  const headers = new Headers({
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": metadata ? "GET, OPTIONS" : "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id",
    "access-control-expose-headers": "www-authenticate, mcp-session-id, retry-after",
  });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (metadata && request.method !== "GET") return new Response(null, { status: 405, headers });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return Response.json({ error: "MCP is unavailable" }, { status: 503, headers });
  }
  // Next may put its internal listening hostname in request.url.
  const resourceUrl = new URL("/mcp", request.url);
  resourceUrl.host = request.headers.get("host") ?? resourceUrl.host;
  const resource = resourceUrl.href;
  if (metadata) {
    // Keep the actual issuer: changing its hostname breaks OAuth issuer validation.
    return Response.json(
      {
        resource,
        authorization_servers: [new URL("/auth/v1", supabaseUrl).href],
        bearer_methods_supported: ["header"],
      },
      { headers },
    );
  }

  const challenge = `Bearer resource_metadata="${resource}/oauth-protected-resource"`;
  if (!request.headers.has("authorization")) {
    headers.set("www-authenticate", challenge);
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const forwarded = new Headers();
  for (const name of [
    "authorization",
    "accept",
    "content-type",
    "mcp-protocol-version",
    "mcp-session-id",
    "last-event-id",
  ]) {
    const value = request.headers.get(name);
    if (value) forwarded.set(name, value);
  }
  // Vercel overwrites this header at ingress. Never trust it off that platform.
  const clientIp = process.env.VERCEL === "1" && request.headers.get("x-vercel-forwarded-for");
  if (clientIp) forwarded.set("x-forwarded-for", clientIp);

  try {
    const response = await fetch(new URL("/functions/v1/mcp", supabaseUrl), {
      method: request.method,
      headers: forwarded,
      ...(request.body ? { body: request.body, duplex: "half" } : {}),
      signal: request.signal,
      cache: "no-store",
      // Never redirect bearer credentials to a different endpoint.
      redirect: "error",
    });
    for (const name of ["content-type", "mcp-session-id", "retry-after", "allow"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (response.status === 401) headers.set("www-authenticate", challenge);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ error: "MCP is temporarily unavailable" }, { status: 502, headers });
  }
}

export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS };

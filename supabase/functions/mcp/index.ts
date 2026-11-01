import { createMcpHandler } from "@modelcontextprotocol/server";
import { pipeline } from "@supabase/middleware";
import { withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { enforceRateLimits } from "./rate-limit.ts";
import { createServer } from "./server.ts";

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
    async (req, { jwtClaims, userClaims, supabase, supabaseAdmin }) => {
      // Supabase anonymous Auth sessions are authenticated JWTs, but are not sign-in.
      if (jwtClaims?.is_anonymous === true) {
        return Response.json(
          { error: "Sign in with a persistent account to use MCP." },
          { status: 403 },
        );
      }
      // Middleware clones share a body cache, but the SDK reads the raw stream.
      // Give both the limiter and SDK an ordinary, independently cloneable Request.
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        signal: req.signal,
        body: req.body ? await req.arrayBuffer() : undefined,
      });
      const denied = await enforceRateLimits(req, userClaims!.id, supabaseAdmin);
      if (denied) return denied;

      const caller = { userId: userClaims!.id, supabase };
      return createMcpHandler(() => createServer(caller)).fetch(req);
    },
  ),
);

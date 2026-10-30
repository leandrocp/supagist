import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { pipeline } from "@supabase/middleware";
import { withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { z } from "zod";
import { renderInput } from "./input.ts";
import { enforceRateLimits } from "./rate-limit.ts";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
    async (req, { jwtClaims, userClaims, supabaseAdmin }) => {
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

      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: "supagist-m0", version: "0.0.1" });
        server.registerTool(
          "render_snippet",
          {
            description:
              "Render code as SVG without publishing. For Supabase/Vercel/etc style use brand, not a theme alias. A brand applies the full app preset; explicit appearance fields override it. Supports filename, auto language (null), fonts/sizes, backgrounds, spacing/corners, window chrome, line numbers, header/footer alignment/details, supplied reactions/comments and author initials. Maximum 30 visual rows including wrapping/comments. Save returned XML as .svg; convert to PNG locally. Use list_options for presets and values. Fixtures are benchmark-only.",
            inputSchema: renderInput,
            annotations: readOnly,
          },
          async (input) => {
            const { renderSnippet } = await import("./render.ts");
            const output = await renderSnippet(input);
            return { content: [{ type: "text" as const, text: output.svg }] };
          },
        );
        server.registerTool(
          "list_options",
          {
            description:
              "Discover supported languages, syntax themes, complete brand presets and all appearance controls. Brand is a full recipe; theme changes only syntax colors. No publishing or saved-snippet access.",
            inputSchema: z.object({}),
            annotations: readOnly,
          },
          async () => {
            const { supportedLanguages, supportedThemes, appearanceOptions } =
              await import("./render.ts");
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    languages: supportedLanguages,
                    themes: supportedThemes,
                    ...appearanceOptions,
                  }),
                },
              ],
            };
          },
        );
        return server;
      });
      return handler.fetch(req);
    },
  ),
);

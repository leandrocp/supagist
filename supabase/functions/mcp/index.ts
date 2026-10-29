import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { pipeline } from "@supabase/middleware";
import { withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { z } from "zod";
import { renderInput } from "./input.ts";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
    async (req, { jwtClaims }) => {
      // Supabase anonymous Auth sessions are authenticated JWTs, but are not sign-in.
      if (jwtClaims?.is_anonymous === true) {
        return Response.json(
          { error: "Sign in with a persistent account to use MCP." },
          { status: 403 },
        );
      }
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: "supagist-m0", version: "0.0.1" });
        server.registerTool(
          "render_snippet",
          {
            description:
              "M0 spike: render code without saving it. Fixtures are benchmark-only presets.",
            inputSchema: renderInput,
            annotations: readOnly,
          },
          async (input) => {
            const { renderSnippet } = await import("./render.ts");
            const output = await renderSnippet(input);
            if (input.format === "svg") {
              return { content: [{ type: "text" as const, text: output.svg }] };
            }
            let binary = "";
            for (const byte of output.png!) binary += String.fromCharCode(byte);
            return {
              content: [{ type: "image" as const, mimeType: "image/png", data: btoa(binary) }],
            };
          },
        );
        server.registerTool(
          "list_options",
          {
            description: "Supported languages and themes in this intentionally limited M0 spike.",
            inputSchema: z.object({}),
            annotations: readOnly,
          },
          async () => {
            const { supportedLanguages, supportedThemes } = await import("./render.ts");
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    languages: supportedLanguages,
                    themes: supportedThemes,
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

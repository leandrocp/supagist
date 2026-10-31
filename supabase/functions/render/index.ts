import { withSupabase } from "@supabase/server";
import { handleRequest, verifyVercelProxyToken } from "./handler.ts";

// The renderer is heavy; options-only and rejected requests never load it.
const renderer = () => import("../mcp/render.ts");

// Optional user: no token renders with per-IP limits; a present but invalid
// token is rejected rather than silently downgraded.
Deno.serve(
  withSupabase({ auth: ["user", "none"] }, (req, ctx) =>
    handleRequest(req, ctx, {
      verifyProxyToken: verifyVercelProxyToken,
      render: async (input) => (await renderer()).renderSnippet(input as never),
      options: async () => {
        const { supportedLanguages, supportedThemes, appearanceOptions } = await renderer();
        return { languages: supportedLanguages, themes: supportedThemes, ...appearanceOptions };
      },
      isInputError: async (error) => error instanceof (await renderer()).RenderInputError,
    }),
  ),
);

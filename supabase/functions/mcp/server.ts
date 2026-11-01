import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderInput } from "./input.ts";
import { publishInput } from "./publish.ts";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// Google Connected Apps snapshots the name, instructions and tool list at
// registration. Describe what each tool does; never name other tools.
export const SERVER_INSTRUCTIONS =
  "Supagist turns source code into polished, shareable code images. It renders a snippet as a self-contained SVG with syntax highlighting, syntax themes, complete brand presets (for example Supabase or Vercel style), fonts, backgrounds, window chrome, line numbers, word-level diffs, header and footer details, and supplied reactions or comments. Rendering is read-only and saves nothing. Publishing saves a new snippet to the signed-in user's account as an unlisted link: anyone with the link can view it, but it never appears in listings or search results, and secrets in the code are always redacted before anything is stored. Access uses the signed-in user's Supagist account and is rate limited per account. One image fits at most 30 visual rows, including wrapped lines and comments; longer code needs an excerpt or several images.";

/** The verified caller, for tools that write to their account. */
export type Caller = { userId: string; supabase: SupabaseClient };

export function createServer(caller?: Caller) {
  const server = new McpServer(
    { name: "supagist", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  server.registerTool(
    "render_snippet",
    {
      description:
        "Renders source code as a code image and returns the complete SVG document as XML text. Nothing is published or saved. code is required: at most 30 source lines and 8,000 Unicode characters. language is an exact language ID, or null to detect it from the filename and code. brand applies a complete app preset (theme, font, background, frame, spacing and metadata), for example brand supabase for Supabase style rather than theme supabase-dark; explicit appearance fields override the brand, and theme changes only syntax colors. Also supports filename, fonts and font sizes, backgrounds, padding and corner radius, window decorations, line numbers, word-level diffs (wordDiff with language diff), header and footer details and alignment, supplied reactions and comments shown with author initials, a 16:9 1600x900 canvas (aspectRatio) and turning ligatures off. Input that needs more than 30 visual rows, including wrapped lines and comments, is rejected rather than cropped.",
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
    "publish_snippet",
    {
      description:
        "Publishes source code as a new Supagist snippet owned by the signed-in user and returns its link. Secrets are always redacted first: provider API keys and tokens, private keys, passwords in connection strings, bearer tokens and KEY, SECRET, PASSWORD or TOKEN style assignments become [REDACTED:kind] placeholders on the same lines. The snippet is unlisted: anyone with the link can view it, but it never appears in listings or search results and its page is marked noindex. Takes the same code and appearance fields as a code image (at most 30 source lines, 8,000 Unicode characters and 30 visual rows) plus an optional title; the page shows the code in the chosen syntax theme and font, and the full code image is stored with it. Returns JSON with url, image_url (the stored SVG image), visibility and redactions (a count per secret kind, never the values). Each call creates a new snippet.",
      inputSchema: publishInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      if (!caller) throw new Error("Sign in to publish snippets.");
      const { publishSnippet } = await import("./publish.ts");
      const result = await publishSnippet(input, caller.userId, caller.supabase);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );
  server.registerTool(
    "list_options",
    {
      description:
        "Lists every supported Supagist rendering option as one JSON object: language IDs, syntax theme names, complete brand presets with their settings, backgrounds, fonts, font sizes, padding, corner radius, window decorations, header and footer defaults, alignments, aspect ratios and input limits. A brand is a complete visual recipe; a theme changes only syntax colors. Takes no input. Read-only; does not publish or access saved snippets.",
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
}

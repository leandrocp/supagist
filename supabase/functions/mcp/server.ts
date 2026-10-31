import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { renderInput } from "./input.ts";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// Google Connected Apps snapshots the name, instructions and tool list at
// registration. Describe what each tool does; never name other tools.
export const SERVER_INSTRUCTIONS =
  "Supagist turns source code into polished, shareable code images. It renders a snippet as a self-contained SVG with syntax highlighting, syntax themes, complete brand presets (for example Supabase or Vercel style), fonts, backgrounds, window chrome, line numbers, word-level diffs, header and footer details, and supplied reactions or comments. Rendering is read-only: nothing is published, saved or shared, and saved Supagist snippets are not accessed. Access uses the signed-in user's Supagist account and is rate limited per account. One image fits at most 30 visual rows, including wrapped lines and comments; longer code needs an excerpt or several images.";

export function createServer() {
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

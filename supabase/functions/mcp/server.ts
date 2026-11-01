import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderInput } from "./input.ts";
import { deleteInput, updateInput } from "./manage.ts";
import { publishInput } from "./publish.ts";
import { searchThemesInput } from "./themes.ts";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// Google Connected Apps snapshots the name, instructions and tool list at
// registration. Describe what each tool does; never name other tools.
export const SERVER_INSTRUCTIONS =
  "Supagist turns source code into polished, shareable code images. It renders a snippet as a self-contained SVG document, or as a PNG image you can look at and iterate on, with syntax highlighting, syntax themes, complete brand presets (for example Supabase or Vercel style), fonts, backgrounds, window chrome, line numbers, word-level diffs, header and footer details, and supplied reactions or comments. Over 200 syntax themes are available; search them by name, family or light and dark appearance instead of guessing an id, and an unknown theme or language id is rejected with its closest matches. Rendering, searching and listing options are read-only and save nothing. Publishing saves a new snippet to the signed-in user's account as an unlisted link: anyone with the link can view it, but it never appears in listings or search results, and secrets in the code are always redacted before anything is stored. The signed-in user can also retitle or change the visibility of their own snippets (published code is sealed), or permanently delete them, by link, and nobody else's. Confirm with the user before publishing, editing or deleting. Access uses the signed-in user's Supagist account and is rate limited per account. One image fits at most 30 visual rows, including wrapped lines and comments; longer code needs an excerpt or several images.";

/** The verified caller, for tools that write to their account. */
export type Caller = {
  userId: string;
  supabase: SupabaseClient;
  /** The caller's own Authorization header, forwarded for PNG rasterization. */
  authorization: string;
};

export function createServer(caller?: Caller) {
  const server = new McpServer(
    { name: "supagist", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  server.registerTool(
    "render_snippet",
    {
      description:
        "Renders source code as a code image. Nothing is published or saved. format svg (the default) returns the complete SVG document as XML text; format png returns a PNG image you can look at, plus its size, at pixelRatio 2 by default (1 for a smaller image). code is required: at most 30 source lines and 8,000 Unicode characters. language is an exact language ID, or null to detect it from the filename and code. brand applies a complete app preset (theme, font, background, frame, spacing and metadata), for example brand supabase for Supabase style rather than theme supabase-dark; explicit appearance fields override the brand, and theme changes only syntax colors. An unknown theme or language is rejected with its closest matches. Also supports filename, fonts and font sizes, backgrounds, padding and corner radius, window decorations, line numbers, word-level diffs (wordDiff with language diff), header and footer details and alignment, supplied reactions and comments shown with author initials, a 16:9 1600x900 canvas (aspectRatio) and turning ligatures off. Input that needs more than 30 visual rows, including wrapped lines and comments, is rejected rather than cropped.",
      inputSchema: renderInput,
      annotations: readOnly,
    },
    async (input) => {
      if (input.format === "png") {
        if (!caller) throw new Error("Sign in to render images.");
        const { renderPng } = await import("./png.ts");
        const png = await renderPng(input, caller.authorization);
        return {
          content: [
            { type: "image" as const, data: png.data, mimeType: "image/png" },
            {
              type: "text" as const,
              text: JSON.stringify({ format: "png", width: png.width, height: png.height }),
            },
          ],
        };
      }
      const { renderSnippet } = await import("./render.ts");
      const output = await renderSnippet(input);
      return { content: [{ type: "text" as const, text: output.svg }] };
    },
  );
  server.registerTool(
    "publish_snippet",
    {
      description:
        "Publishes source code as a new Supagist snippet owned by the signed-in user and returns its link. Secrets are always redacted first: provider API keys and tokens, private keys, passwords in connection strings, bearer tokens and KEY, SECRET, PASSWORD or TOKEN style assignments become [REDACTED:kind] placeholders on the same lines. The snippet is unlisted: anyone with the link can view it, but it never appears in listings or search results and its page is marked noindex. Takes the same code and appearance fields as a code image (at most 30 source lines, 8,000 Unicode characters and 30 visual rows) plus an optional title; the page shows the code in the chosen syntax theme and font, and the full code image is stored with it. Returns JSON with url, image_url (the stored SVG image), visibility and redactions (a count per secret kind, never the values). Each call creates a new public link, so confirm with the user before calling it.",
      inputSchema: publishInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        // Creates a link anyone holding it can open.
        openWorldHint: true,
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
    "search_themes",
    {
      description:
        "Searches the syntax themes by name, family and appearance, and returns JSON with themes (each with id, appearance dark or light, family and kind lumis or brand), total, offset and nextOffset (null on the last page). query matches words in theme ids and families, for example catppuccin, github dark or rose pine. family is the upstream theme project, such as nightfox, tokyonight or zenbones, or a brand such as supabase; appearance keeps only dark or light themes. Results are sorted with exact and prefix id matches first; page with limit (1-100, default 25) and offset. Pass a returned id as the theme of a code image. Read-only.",
      inputSchema: searchThemesInput,
      annotations: readOnly,
    },
    async (input) => {
      const { searchThemes } = await import("./themes.ts");
      return { content: [{ type: "text" as const, text: JSON.stringify(searchThemes(input)) }] };
    },
  );
  server.registerTool(
    "update_snippet",
    {
      description:
        "Edits a snippet the signed-in user owns, identified by its supagist.app link; snippets owned by anyone else are refused. A published snippet is sealed: only its title and visibility (public or unlisted) can change, and the link stays the same. To change the code, language or theme, delete the snippet and publish it again. Secrets in the title are always redacted first. Returns JSON with url, visibility and redactions (a count per secret kind, never the values).",

      inputSchema: updateInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      if (!caller) throw new Error("Sign in to edit snippets.");
      const { updateSnippet } = await import("./manage.ts");
      const result = await updateSnippet(input, caller.userId, caller.supabase);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );
  server.registerTool(
    "delete_snippet",
    {
      description:
        "Permanently deletes a snippet the signed-in user owns, identified by its supagist.app link, together with its stored images, reactions and comments; snippets owned by anyone else are refused. This cannot be undone and the link stops working. Returns JSON with the deleted link.",
      inputSchema: deleteInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      if (!caller) throw new Error("Sign in to delete snippets.");
      const { deleteSnippet } = await import("./manage.ts");
      const result = await deleteSnippet(input, caller.userId, caller.supabase);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );
  server.registerTool(
    "list_options",
    {
      description:
        "Lists every supported Supagist rendering option as one JSON object: output formats (svg, png) and pixel ratios, language IDs, syntax theme IDs, complete brand presets with their settings, backgrounds, fonts, font sizes, padding, corner radius, window decorations, header and footer defaults, alignments, aspect ratios and input limits. A brand is a complete visual recipe; a theme changes only syntax colors. Takes no input. Read-only; does not publish or access saved snippets.",
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
              formats: ["svg", "png"],
              pixelRatios: { svg: [1, 2], png: [1, 2] },
              defaults: { format: "svg", pixelRatio: { svg: 1, png: 2 } },
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

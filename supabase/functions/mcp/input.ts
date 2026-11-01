import { z } from "zod";
import { BRAND_PRESETS } from "./spike/generated/brand-presets.js";
import { normalizeSnippetCode } from "./spike/generated/snippet-utils.js";
import {
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE_VALUES,
  EXPORT_OUTER_PADDING_VALUES,
  EXPORT_INNER_PADDING_VALUES,
  EXPORT_CORNER_RADIUS_VALUES,
} from "./spike/generated/export-utils.js";

export const backgrounds = [...EXPORT_BACKGROUNDS, ...EXPORT_BRAND_BACKGROUNDS];
const alignment = z.enum(["left", "center", "right"]);
const lineKey = z
  .string()
  .refine(
    (key) =>
      Number.isInteger(Number(key)) &&
      Number(key) >= 1 &&
      Number(key) <= 30 &&
      String(Number(key)) === key,
    "Use a source line number from 1 to 30",
  );
const username = z.string().min(1).max(64);

// Accepted from older clients and ignored, so cached tool schemas keep working.
const LEGACY_FIELDS = new Set(["fixture"]);

const renderShape = {
  code: z
    .string()
    .max(16000)
    .transform((code): string => normalizeSnippetCode(code))
    .refine(
      (code) => Array.from(code).length >= 1 && Array.from(code).length <= 8000,
      "code must contain 1–8000 Unicode code points",
    )
    .refine(
      (code) => code.split("\n").length <= 30,
      "Choose an excerpt of at most 30 source lines",
    ),
  language: z
    .string()
    .min(1)
    .max(64)
    .nullable()
    .default("javascript")
    .describe("Exact language ID, or null to auto-detect from filename/code"),
  filename: z.string().min(1).max(120).default("snippet"),
  brand: z
    .enum(BRAND_PRESETS.map((preset) => preset.id))
    .optional()
    .describe(
      "Complete app Brand preset: theme, font, scene, frame, spacing and metadata. Use supabase for Supabase style, NOT theme supabase-dark.",
    ),
  theme: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .describe(
      "Syntax colors only. Omit to retain the brand theme, otherwise github_dark is the default.",
    ),
  background: z
    .enum(backgrounds.map((background) => background.label))
    .nullable()
    .optional()
    .describe(
      "Canvas label (case-sensitive), or null for no canvas. Overrides only the background, not the full brand.",
    ),
  fontId: z.enum(EXPORT_FONTS.map((font) => font.id)).optional(),
  fontSize: z.literal(EXPORT_FONT_SIZE_VALUES).optional(),
  outerPadding: z.literal(EXPORT_OUTER_PADDING_VALUES).optional(),
  innerPadding: z.literal(EXPORT_INNER_PADDING_VALUES).optional(),
  cornerRadius: z.literal(EXPORT_CORNER_RADIUS_VALUES).optional(),
  windowDecoration: z
    .enum(["macos", "macos-subtle", "windows", "minimal", "none", "lumis", "markdown"])
    .optional(),
  lineNumbers: z.boolean().optional(),
  wordDiff: z
    .boolean()
    .optional()
    .describe(
      "Word-level diff (like Lumis --word-diff): with language diff, highlight only the changed words inside paired -/+ lines. Default false.",
    ),
  header: z
    .strictObject({
      enabled: z.boolean().optional(),
      showFilename: z.boolean().optional(),
      showLanguage: z.boolean().optional(),
      filenamePosition: alignment.optional(),
      languagePosition: alignment.optional(),
    })
    .optional(),
  footer: z
    .strictObject({
      enabled: z.boolean().optional(),
      showLanguage: z.boolean().optional(),
      showTheme: z.boolean().optional(),
      showLineCount: z.boolean().optional(),
      showCharCount: z.boolean().optional(),
      showAuthor: z.boolean().optional(),
      alignment: alignment.optional(),
    })
    .optional(),
  author: username.optional(),
  reactions: z
    .record(
      lineKey,
      z
        .array(
          z.strictObject({
            emoji: z.string().min(1).max(16),
            reactors: z.array(z.strictObject({ username })).min(1).max(10),
          }),
        )
        .max(5),
    )
    .optional()
    .describe(
      "Supplied annotation data, keyed by 1-based source line. Avatars use initials; no remote image URLs.",
    ),
  comments: z
    .record(
      lineKey,
      z.strictObject({
        author: username.optional(),
        body: z.string().min(1).max(2000),
      }),
    )
    .optional(),
  showReactions: z.boolean().optional(),
  showComments: z.boolean().optional(),
  aspectRatio: z
    .enum(["16:9"])
    .optional()
    .describe(
      "16:9 centers the card on a 1600x900 canvas (times pixelRatio) filled by the background. Omit to size the image to the card.",
    ),
  ligatures: z
    .boolean()
    .optional()
    .describe(
      "false draws operator sequences such as |> -> != as separate characters. Omit to keep the font's ligatures.",
    ),
  format: z
    .enum(["svg", "png"])
    .default("svg")
    .describe(
      "svg returns the SVG document as text; png returns a PNG image the model can see. Default svg.",
    ),
  pixelRatio: z
    .union([z.literal(1), z.literal(2)])
    .optional()
    .describe("Output scale: 1 or 2. Default 1 for svg and 2 for png."),
};

// Loose only so legacy fields parse; the advertised schema stays closed and
// any other unknown field is still rejected.
export const renderInput = z
  .looseObject(renderShape)
  .meta({ additionalProperties: false })
  .superRefine((input, ctx) => {
    for (const key of Object.keys(input)) {
      if (!(key in renderShape) && !LEGACY_FIELDS.has(key))
        ctx.addIssue({ code: "unrecognized_keys", keys: [key], message: `Unknown field: ${key}` });
    }
  })
  .refine(
    (input) =>
      [...Object.keys(input.reactions ?? {}), ...Object.keys(input.comments ?? {})].every(
        (key) => Number(key) <= input.code.split("\n").length,
      ),
    "Annotations must refer to an existing source line",
  );

export type RenderInput = z.input<typeof renderInput>;

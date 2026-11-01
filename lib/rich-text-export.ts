import { textDecoration } from "@lumis-sh/lumis/formatters/html";
import type { ThemeData } from "@lumis-sh/themes";
import {
  highlightTokenLines,
  loadLanguageOrPlaintext,
  type HighlightedToken,
} from "@/lib/lumis-lines";
import {
  EXPORT_FONT_SIZE,
  EXPORT_FONTS,
  EXPORT_MAX_LINES,
  escapeXml,
  exportLineHeightForFontSize,
  inferLanguage,
  normalizeExportFontSize,
} from "@/lib/export-utils";

/** What "Copy as rich text" writes: the same code as styled HTML and as text. */
export type RichTextClipboard = { html: string; text: string };

export type RichTextOptions = {
  theme: ThemeData;
  fontId?: string;
  fontSize?: number;
};

// Office and Google Slides ignore `ui-monospace` and web fonts they lack, so
// the export font is followed by fonts those apps actually ship.
const PASTE_FALLBACK_FONTS = `Menlo,Consolas,"Courier New",monospace`;

// The same editor colours and fallbacks `createHighlightedSvg` paints the card
// with, for themes that leave `normal` unset.
function editorColors(theme: ThemeData): { bg: string; fg: string } {
  const normal = theme.highlights?.["normal"] as { bg?: string; fg?: string } | undefined;
  const dark = theme.appearance === "dark";
  return {
    bg: normal?.bg ?? (dark ? "#282c34" : "#f8f8f8"),
    fg: normal?.fg ?? (dark ? "#abb2bf" : "#383a42"),
  };
}

function css(declarations: Array<[string, string | undefined]>) {
  return declarations
    .filter(([, value]) => value)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
}

/**
 * Rich-text clipboard HTML for highlighted rows, in the shape VS Code's "Copy
 * with syntax highlighting" writes: one `<div>` per source line inside a block
 * that carries the theme background, foreground and monospace font, with every
 * token an inline-styled `<span>`. Slides, Keynote, PowerPoint and Docs keep
 * inline styles and drop stylesheets, so nothing relies on a class.
 */
export function richTextHtml(
  lines: HighlightedToken[][],
  { theme, fontId, fontSize = EXPORT_FONT_SIZE }: RichTextOptions,
): string {
  const { bg, fg } = editorColors(theme);
  const size = normalizeExportFontSize(fontSize);
  const font = EXPORT_FONTS.find((f) => f.id === fontId) ?? EXPORT_FONTS[0]!;
  const family = font.file ? `"${font.family}",${PASTE_FALLBACK_FONTS}` : font.family;

  // Same cap as the image: the first EXPORT_MAX_LINES rows, then a "…" row.
  const rows = lines.slice(0, EXPORT_MAX_LINES).map((tokens) => {
    if (tokens.length === 0) return "<div><br></div>";
    const spans = tokens.map(({ text, style }) => {
      const decoration = style ? textDecoration(style) : "none";
      const attrs = css([
        ["color", style?.fg],
        ["background-color", style?.bg && style.bg !== bg ? style.bg : undefined],
        ["font-weight", style?.bold ? "bold" : undefined],
        ["font-style", style?.italic ? "italic" : undefined],
        ["text-decoration", decoration === "none" ? undefined : decoration],
      ]);
      const escaped = escapeXml(text);
      return attrs
        ? `<span style="${escapeXml(attrs)}">${escaped}</span>`
        : `<span>${escaped}</span>`;
    });
    return `<div>${spans.join("")}</div>`;
  });
  if (lines.length > EXPORT_MAX_LINES) rows.push("<div>…</div>");

  const block = css([
    ["background-color", bg],
    ["color", fg],
    ["font-family", family],
    ["font-size", `${size}px`],
    ["line-height", `${exportLineHeightForFontSize(size)}px`],
    ["white-space", "pre"],
  ]);
  return `<meta charset="utf-8"><div style="${escapeXml(block)}">${rows.join("")}</div>`;
}

/**
 * Highlights `code` with the same Lumis highlighter, theme and language
 * resolution as the image export and returns both clipboard flavours, cut to
 * the same first EXPORT_MAX_LINES lines as the image.
 */
export async function createRichTextClipboard(
  code: string,
  filename: string,
  themeId: string,
  options: { fontId?: string; fontSize?: number; language?: string | null } = {},
): Promise<RichTextClipboard> {
  const [{ clientHighlighterPromise }, { loadTheme }] = await Promise.all([
    import("@/lib/lumis-client"),
    import("@/lib/theme-loader"),
  ]);
  const [{ data: theme }, highlighter] = await Promise.all([
    loadTheme(themeId),
    clientHighlighterPromise,
  ]);
  const language = await loadLanguageOrPlaintext(
    highlighter,
    options.language || inferLanguage(filename, code),
  );
  const lines = highlightTokenLines(highlighter, code, language, theme);
  return {
    html: richTextHtml(lines, { theme, fontId: options.fontId, fontSize: options.fontSize }),
    text: code.split(/\r?\n/).slice(0, EXPORT_MAX_LINES).join("\n"),
  };
}

/**
 * Writes both flavours through the async Clipboard API. The `ClipboardItem` is
 * built before the highlight resolves so Safari still sees the click that
 * started the copy. Browsers without `ClipboardItem` fall back to a `copy`
 * event, which also carries both flavours, and then to plain text.
 */
export async function copyRichText(payload: Promise<RichTextClipboard>): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const blob = (type: "html" | "text") =>
      payload.then(
        (p) => new Blob([p[type]], { type: type === "html" ? "text/html" : "text/plain" }),
      );
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": blob("html"), "text/plain": blob("text") }),
    ]);
    return;
  }

  const { html, text } = await payload;
  let copied = false;
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
    copied = true;
  };
  document.addEventListener("copy", onCopy);
  try {
    document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy);
  }
  if (!copied) await navigator.clipboard.writeText(text);
}

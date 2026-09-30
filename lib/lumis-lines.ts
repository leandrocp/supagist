import type { CSSProperties } from "react";
import type { HighlightStyle, Highlighter } from "@lumis-sh/lumis";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import { textDecoration } from "@lumis-sh/lumis/formatters/html";
import type { ThemeData } from "@lumis-sh/themes";

/** A run of text on one source line, styled the way Lumis resolved it. */
export type HighlightedToken = { text: string; style?: HighlightStyle };

type LineHighlighter = Pick<Highlighter, "highlight" | "highlightIter">;

/**
 * Load `language`, or settle for plain text when its parser cannot load (a
 * network failure, an integrity check, an unknown id). A snippet that cannot be
 * colored must still render, export, and publish. Returns the language to
 * highlight with.
 */
export async function loadLanguageOrPlaintext(
  highlighter: Pick<Highlighter, "loadLanguage">,
  language: string,
): Promise<string> {
  try {
    await highlighter.loadLanguage(language);
    return language;
  } catch (error) {
    console.warn(`Lumis could not load ${language}; rendering plain text.`, error);
    return "plaintext";
  }
}

/**
 * Per-line token runs for the editors and the SVG export. There is one entry
 * per `code.split("\n")` row, the row model every editor surface uses, and no
 * token carries a line terminator: the CR of a CRLF is dropped even when Lumis
 * delivers it in a different token than its LF.
 *
 * The style is the one `highlightIter` resolves, which applies the theme's
 * language-specific scopes (`keyword.import.typescript`) and parent-scope
 * fallbacks. Looking `theme.highlights[scope]` up directly skips both.
 */
export function highlightTokenLines(
  highlighter: LineHighlighter,
  code: string,
  language: string,
  theme: ThemeData,
): HighlightedToken[][] {
  const lines: HighlightedToken[][] = code.split("\n").map(() => []);
  let lineIndex = 0;

  const endLine = () => {
    const line = lines[lineIndex];
    const last = line?.at(-1);
    if (line && last?.text.endsWith("\r")) {
      last.text = last.text.slice(0, -1);
      if (!last.text) line.pop();
    }
    lineIndex += 1;
  };

  highlighter.highlightIter(code, language, theme, (text, _language, _range, _scope, style) => {
    const chunks = text.split("\n");
    chunks.forEach((chunk, index) => {
      if (chunk) lines[lineIndex]?.push({ text: chunk, style });
      if (index < chunks.length - 1) endLine();
    });
  });

  return lines;
}

/**
 * Inline styles for a token, matching what `htmlInline({ italic: true })`
 * writes for the saved view so both editors paint a token the same way.
 */
export function tokenStyle(style: HighlightStyle | undefined): CSSProperties | undefined {
  if (!style) return undefined;
  const decoration = textDecoration(style);
  return {
    color: style.fg,
    backgroundColor: style.bg,
    fontWeight: style.bold ? "bold" : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    textDecoration: decoration === "none" ? undefined : decoration,
  };
}

/**
 * Escaped, inline-styled HTML for each `code.split("\n")` row, for the saved
 * view's per-line grid. Lumis's inline structure closes and reopens a span that
 * crosses a newline, so every row is balanced HTML on its own.
 */
export function highlightHtmlLines(
  highlighter: LineHighlighter,
  code: string,
  language: string,
  theme: ThemeData,
): string[] {
  const html = highlighter.highlight(
    code,
    htmlInline({ language, theme, structure: "inline", italic: true }),
  );
  const lines = html.split("\n");
  // A final newline ends the last line rather than opening an empty one, but
  // the grid still renders that empty row.
  const rowCount = code.split("\n").length;
  while (lines.length < rowCount) lines.push("");
  return lines;
}

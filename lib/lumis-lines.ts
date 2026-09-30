import type { CSSProperties } from "react";
import type {
  Annotation,
  Formatter,
  HighlightEvent,
  HighlightStyle,
  Highlighter,
} from "@lumis-sh/lumis";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import { getScopedThemeStyle, textDecoration } from "@lumis-sh/lumis/formatters/html";
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

/** One styled run of text within a single source line. */
export type LineToken = {
  text: string;
  /** Tree-sitter scope, or "" for text no capture matched. */
  scope: string;
  /** The language the token came from — injections differ from the document's. */
  language: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
};

/** A source line, its tokens, and whatever the caller annotated it with. */
export type HighlightedLine<T> = {
  /** 1-based, matching the line numbers reactions and comments are keyed by. */
  number: number;
  tokens: LineToken[];
  /** Properties of every annotation covering any part of this line, in the
   *  order the caller supplied them. */
  overlays: T[];
};

/** Unstyled rows, for before the highlighter resolves or after it fails. */
export function plainLines(code: string, language: string): LineToken[][] {
  return code.split(/\r?\n/).map((text) => (text ? [{ text, scope: "", language }] : []));
}

/**
 * Builds line-range annotations from a map keyed by 1-based line number.
 *
 * A blank line produces an empty range, which Lumis composes as a point at that
 * position — so a reaction or comment on a blank line needs no special case.
 */
export function lineAnnotations<T>(
  code: string,
  overlaysByLine: Readonly<Record<number, T>>,
): Annotation<T>[] {
  const encoder = new TextEncoder();
  const lines = code.split("\n");
  const annotations: Annotation<T>[] = [];

  for (const [key, data] of Object.entries(overlaysByLine)) {
    const lineNumber = Number(key);
    const line = lines[lineNumber - 1];
    if (line === undefined) continue;

    annotations.push({
      range: {
        type: "position",
        start: { line: lineNumber - 1, column: 0 },
        // A CRLF source keeps its \r on the line and Lumis counts it, so
        // measuring the split result rather than the raw line would land the
        // end column one byte short and silently clip the last character.
        end: { line: lineNumber - 1, column: encoder.encode(line).length },
      },
      data,
    });
  }

  return annotations;
}

/**
 * Splits Lumis's event stream into one row per source line.
 *
 * This replaces hand-rolling `text.split(/\r?\n/)` against `highlightIter` and
 * tracking a line cursor, which the composer, the saved view and the SVG export
 * each used to do separately — and which the export got subtly wrong by
 * splitting on `\n` alone, leaving a stray `\r` at the end of every line.
 */
export function lineFormatter<T>(
  language: string,
  theme: ThemeData,
): Formatter<T> & { lines: HighlightedLine<T>[] } {
  const decoder = new TextDecoder();

  return {
    language,
    lines: [],
    render(source: string, events: readonly HighlightEvent<T>[]): string {
      const sourceBytes = new TextEncoder().encode(source);
      const lines: HighlightedLine<T>[] = source
        .split("\n")
        .map((_, index) => ({ number: index + 1, tokens: [], overlays: [] }));

      const scopes: Array<{ scope: string; language: string }> = [];
      // An annotation that is still open when an outer one closes is closed and
      // reopened, so the same annotation's data can start more than once.
      // Track it by identity to record each one on a line only once.
      const openAnnotations: T[] = [];
      let lineIndex = 0;

      const noteOverlay = (data: T) => {
        const line = lines[lineIndex];
        if (line && !line.overlays.includes(data)) {
          line.overlays.push(data);
        }
      };

      for (const event of events) {
        if (event.type === "start") {
          scopes.push({ scope: event.scope, language: event.language });
        } else if (event.type === "end") {
          scopes.pop();
        } else if (event.type === "annotationStart") {
          openAnnotations.push(event.data);
          noteOverlay(event.data);
        } else if (event.type === "annotationEnd") {
          openAnnotations.pop();
        } else if (event.type === "source") {
          const text = decoder.decode(sourceBytes.subarray(event.start, event.end));
          const active = scopes[scopes.length - 1];
          const scope = active?.scope ?? "";
          const style = getScopedThemeStyle(theme, scope, active?.language ?? language);
          const chunks = text.split("\n");

          chunks.forEach((chunk, chunkIndex) => {
            if (chunk) {
              lines[lineIndex]?.tokens.push({
                text: chunk,
                scope,
                language: active?.language ?? language,
                color: style?.fg,
                bold: style?.bold,
                italic: style?.italic,
              });
            }
            if (chunkIndex < chunks.length - 1) {
              const tokens = lines[lineIndex]?.tokens;
              const last = tokens?.at(-1);
              if (last?.text.endsWith("\r")) {
                last.text = last.text.slice(0, -1);
                if (!last.text) tokens?.pop();
              }
              lineIndex += 1;
              // A multi-line annotation covers the lines it crosses, not just
              // the one it opened on.
              for (const data of openAnnotations) noteOverlay(data);
            }
          });
        }
      }

      this.lines = lines;
      return "";
    },
  };
}

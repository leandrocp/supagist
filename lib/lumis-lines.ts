import type { Annotation, Formatter, HighlightEvent, ResolvedAnnotation } from "@lumis-sh/lumis";
import type { ThemeData } from "@lumis-sh/themes";

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

type ThemeHighlight = { fg?: string; bold?: boolean; italic?: boolean };

/** Unstyled rows, for before the highlighter resolves or after it fails. */
export function plainLines(code: string, language: string): LineToken[][] {
  return code.split(/\r?\n/).map((text) => (text ? [{ text, scope: "", language }] : []));
}

function scopeStyle(theme: ThemeData, scope: string): ThemeHighlight | undefined {
  if (!scope) return undefined;
  return theme.highlights?.[scope] as ThemeHighlight | undefined;
}

/**
 * Builds line-range annotations from a map keyed by 1-based line number.
 *
 * Lumis rejects an empty range, so a line with no characters cannot carry an
 * annotation of its own. Those are reported separately rather than dropped, so
 * a reaction on a blank line still reaches the renderer.
 */
export function lineAnnotations<T>(
  code: string,
  overlaysByLine: Readonly<Record<number, T>>,
): { annotations: Annotation<T>[]; blankLines: Map<number, T> } {
  const encoder = new TextEncoder();
  const lines = code.split("\n");
  const annotations: Annotation<T>[] = [];
  const blankLines = new Map<number, T>();

  for (const [key, properties] of Object.entries(overlaysByLine)) {
    const lineNumber = Number(key);
    const line = lines[lineNumber - 1];
    if (line === undefined) continue;

    // A CRLF source keeps its \r on the line, and Lumis counts it, so measuring
    // the split result rather than the raw line would land the end column one
    // byte short and silently clip the last character.
    const width = encoder.encode(line).length;
    if (width === 0) {
      blankLines.set(lineNumber, properties);
      continue;
    }

    annotations.push({
      range: {
        type: "position",
        start: { line: lineNumber - 1, column: 0 },
        end: { line: lineNumber - 1, column: width },
      },
      properties,
    });
  }

  return { annotations, blankLines };
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
  blankLines?: ReadonlyMap<number, T>,
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
      // reopened, so the same resolved annotation can start more than once.
      // Track it by identity to record each one on a line only once.
      const openAnnotations: ResolvedAnnotation<T>[] = [];
      let lineIndex = 0;

      const noteOverlay = (annotation: ResolvedAnnotation<T>) => {
        const line = lines[lineIndex];
        if (line && !line.overlays.includes(annotation.properties)) {
          line.overlays.push(annotation.properties);
        }
      };

      for (const event of events) {
        if (event.type === "start") {
          scopes.push({ scope: event.scope, language: event.language });
        } else if (event.type === "end") {
          scopes.pop();
        } else if (event.type === "annotationStart") {
          openAnnotations.push(event.annotation);
          noteOverlay(event.annotation);
        } else if (event.type === "annotationEnd") {
          openAnnotations.pop();
        } else {
          const text = decoder.decode(sourceBytes.subarray(event.startByte, event.endByte));
          const active = scopes[scopes.length - 1];
          const scope = active?.scope ?? "";
          const style = scopeStyle(theme, scope);
          const chunks = text.split(/\r?\n/);

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
              lineIndex += 1;
              // A multi-line annotation covers the lines it crosses, not just
              // the one it opened on.
              for (const annotation of openAnnotations) noteOverlay(annotation);
            }
          });
        }
      }

      if (blankLines) {
        for (const [lineNumber, properties] of blankLines) {
          lines[lineNumber - 1]?.overlays.push(properties);
        }
      }

      this.lines = lines;
      return "";
    },
  };
}

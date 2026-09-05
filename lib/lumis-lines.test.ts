import { describe, expect, it } from "vitest";
import { createHighlighter } from "@lumis-sh/lumis";
import javascript from "@lumis-sh/lumis/langs/javascript";
import type { ThemeData } from "@lumis-sh/themes";
import { lineAnnotations, lineFormatter, type HighlightedLine } from "@/lib/lumis-lines";

const theme = {
  name: "test",
  appearance: "dark",
  highlights: {
    keyword: { fg: "#c678dd", bold: true },
    variable: { fg: "#e06c75" },
    normal: { fg: "#abb2bf" },
  },
} as unknown as ThemeData;

const highlighterPromise = createHighlighter({ languages: [javascript] });

type Overlay = { kind: string; line: number };

async function highlight(
  code: string,
  overlaysByLine: Record<number, Overlay> = {},
): Promise<HighlightedLine<Overlay>[]> {
  const highlighter = await highlighterPromise;
  const { annotations, blankLines } = lineAnnotations(code, overlaysByLine);
  const formatter = lineFormatter<Overlay>("javascript", theme, blankLines);
  highlighter.highlight(code, formatter, { annotations });
  return formatter.lines;
}

const textOf = (line: HighlightedLine<Overlay>) => line.tokens.map((t) => t.text).join("");

describe("lineFormatter", () => {
  it("returns one row per source line and preserves every character", async () => {
    const code = "const a = 1;\nconst b = 2;\n\nconst c = 3;";
    const lines = await highlight(code);

    expect(lines).toHaveLength(4);
    expect(lines.map((l) => l.number)).toEqual([1, 2, 3, 4]);
    expect(lines.map(textOf).join("\n")).toBe(code);
  });

  it("carries theme styling through from the scope", async () => {
    const [line] = await highlight("const a = 1;");
    const keyword = line!.tokens.find((t) => t.text === "const");

    expect(keyword).toMatchObject({ scope: "keyword", color: "#c678dd", bold: true });
  });

  it("splits CRLF sources without leaving a stray carriage return", async () => {
    // The SVG export used to split on "\n" alone, so every line kept a trailing
    // \r that pushed inline content onto a fresh visual row.
    const lines = await highlight("const a = 1;\r\nconst b = 2;\r\n");

    expect(lines.map(textOf)).toEqual(["const a = 1;", "const b = 2;", ""]);
    expect(lines.some((l) => l.tokens.some((t) => t.text.includes("\r")))).toBe(false);
  });

  it("attaches an overlay to the line its annotation covers", async () => {
    const lines = await highlight("const a = 1;\nconst b = 2;", {
      2: { kind: "reaction", line: 2 },
    });

    expect(lines[0]!.overlays).toEqual([]);
    expect(lines[1]!.overlays).toEqual([{ kind: "reaction", line: 2 }]);
  });

  it("places overlays on lines whose text contains multibyte characters", async () => {
    const code = "const wave = '👋';\nconst fire = '🔥';";
    const lines = await highlight(code, { 1: { kind: "reaction", line: 1 } });

    expect(lines.map(textOf).join("\n")).toBe(code);
    expect(lines[0]!.overlays).toEqual([{ kind: "reaction", line: 1 }]);
    expect(lines[1]!.overlays).toEqual([]);
  });

  it("keeps an overlay on a blank line, which has no range to annotate", async () => {
    // Lumis rejects an empty range, so a reaction on a blank line cannot be
    // expressed as an annotation. It still has to reach the renderer.
    const lines = await highlight("const a = 1;\n\nconst c = 3;", {
      2: { kind: "reaction", line: 2 },
    });

    expect(textOf(lines[1]!)).toBe("");
    expect(lines[1]!.overlays).toEqual([{ kind: "reaction", line: 2 }]);
  });

  it("records an overlay once per line even when a scope reopens it", async () => {
    // Overlapping annotations close and reopen each other, so the same
    // annotation can start more than once over one line.
    const code = "const price = compute(1);";
    const highlighter = await highlighterPromise;
    const formatter = lineFormatter<Overlay>("javascript", theme);
    highlighter.highlight(code, formatter, {
      annotations: [
        { range: { type: "offset", start: 6, end: 14 }, properties: { kind: "outer", line: 1 } },
        { range: { type: "offset", start: 10, end: 20 }, properties: { kind: "inner", line: 1 } },
      ],
    });

    expect(formatter.lines[0]!.overlays).toEqual([
      { kind: "outer", line: 1 },
      { kind: "inner", line: 1 },
    ]);
  });

  it("marks every line a multi-line annotation crosses", async () => {
    const code = "function add(a, b) {\n  return a + b;\n}";
    const highlighter = await highlighterPromise;
    const formatter = lineFormatter<Overlay>("javascript", theme);
    highlighter.highlight(code, formatter, {
      annotations: [
        {
          range: {
            type: "position",
            start: { line: 0, column: 0 },
            end: { line: 2, column: 1 },
          },
          properties: { kind: "block", line: 1 },
        },
      ],
    });

    expect(formatter.lines.map((l) => l.overlays)).toEqual([
      [{ kind: "block", line: 1 }],
      [{ kind: "block", line: 1 }],
      [{ kind: "block", line: 1 }],
    ]);
  });
});

describe("lineAnnotations", () => {
  it("measures the end column in UTF-8 bytes, not characters", async () => {
    const code = "const wave = '👋';";
    const { annotations } = lineAnnotations(code, { 1: { kind: "r", line: 1 } });

    expect(annotations[0]!.range).toEqual({
      type: "position",
      start: { line: 0, column: 0 },
      end: { line: 0, column: new TextEncoder().encode(code).length },
    });

    // And the range Lumis resolves it to covers the whole line.
    const highlighter = await highlighterPromise;
    const formatter = lineFormatter<Overlay>("javascript", theme);
    highlighter.highlight(code, formatter, { annotations });
    expect(formatter.lines[0]!.overlays).toHaveLength(1);
  });

  it("counts the carriage return a CRLF line ends with", () => {
    const { annotations } = lineAnnotations("const a = 1;\r\nx", { 1: { kind: "r", line: 1 } });

    expect(annotations[0]!.range).toMatchObject({ end: { line: 0, column: 13 } });
  });

  it("separates blank lines rather than emitting an empty range", () => {
    const { annotations, blankLines } = lineAnnotations("a\n\nb", {
      1: { kind: "r", line: 1 },
      2: { kind: "r", line: 2 },
    });

    expect(annotations).toHaveLength(1);
    expect(blankLines.get(2)).toEqual({ kind: "r", line: 2 });
  });

  it("ignores a line number past the end of the source", () => {
    const { annotations, blankLines } = lineAnnotations("a\nb", { 99: { kind: "r", line: 99 } });

    expect(annotations).toEqual([]);
    expect(blankLines.size).toBe(0);
  });
});

// Runs the real Lumis highlighter (installed parsers, no mocks): these helpers
// exist to pin how Lumis output maps onto the editors' row model, so a mock
// would only test the mock.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { createHighlighter, type Highlighter } from "@lumis-sh/lumis";
import javascript from "@lumis-sh/lumis/langs/javascript";
import type { ThemeData } from "@lumis-sh/themes";
import doomOneDark from "@lumis-sh/themes/doom_one_dark";
import everforestDark from "@lumis-sh/themes/everforest_dark";
import {
  lineAnnotations,
  lineFormatter,
  type HighlightedLine,
  highlightHtmlLines,
  highlightTokenLines,
  loadLanguageOrPlaintext,
  tokenStyle,
  type HighlightedToken,
} from "@/lib/lumis-lines";

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await createHighlighter({ languages: [] });
  await highlighter.loadLanguage("typescript");
  await highlighter.loadLanguage("python");
});

const lineText = (tokens: HighlightedToken[]) => tokens.map((token) => token.text).join("");

describe("loadLanguageOrPlaintext", () => {
  it("returns the language once it is loaded", async () => {
    await expect(loadLanguageOrPlaintext(highlighter, "typescript")).resolves.toBe("typescript");
  });

  it("falls back to plain text when the parser cannot load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const language = await loadLanguageOrPlaintext(highlighter, "not-a-language");

    expect(language).toBe("plaintext");
    expect(warn).toHaveBeenCalled();
    expect(highlightHtmlLines(highlighter, "a <b>", language, everforestDark)).toEqual([
      "a &lt;b&gt;",
    ]);
    warn.mockRestore();
  });
});

describe("highlightTokenLines", () => {
  it("returns one row per code.split('\\n') entry, including a trailing empty row", () => {
    const code = "const a = 1;\n\nconst b = 2;\n";
    const lines = highlightTokenLines(highlighter, code, "typescript", everforestDark);

    expect(lines.map(lineText)).toEqual(["const a = 1;", "", "const b = 2;", ""]);
  });

  it("drops the CR of CRLF line endings", () => {
    const code = "const a = 1;\r\nconst b = 2;\r\n";
    const lines = highlightTokenLines(highlighter, code, "typescript", everforestDark);

    expect(lines.map(lineText)).toEqual(["const a = 1;", "const b = 2;", ""]);
    expect(lines.flat().some((token) => /[\r\n]/.test(token.text))).toBe(false);
  });

  it("uses the theme's language-specific scope over the generic one", () => {
    const [line] = highlightTokenLines(
      highlighter,
      'import { x } from "y";',
      "typescript",
      everforestDark,
    );
    const keyword = line!.find((token) => token.text === "import");

    expect(everforestDark.highlights["keyword.import"]?.fg).toBe("#e67e80");
    expect(keyword?.style?.fg).toBe(everforestDark.highlights["keyword.import.typescript"]?.fg);
  });

  it("splits a multi-line token into per-row runs with the same style", () => {
    const lines = highlightTokenLines(highlighter, "/* one\n two */", "typescript", everforestDark);

    expect(lines.map(lineText)).toEqual(["/* one", " two */"]);
    expect(lines[0]![0]!.style).toEqual(everforestDark.highlights.comment);
    expect(lines[1]![0]!.style).toEqual(everforestDark.highlights.comment);
  });
});

describe("tokenStyle", () => {
  it("returns undefined for an unstyled token", () => {
    expect(tokenStyle(undefined)).toBeUndefined();
  });

  it("maps every style field the saved view's inline HTML writes", () => {
    expect(
      tokenStyle({ fg: "#111", bg: "#222", bold: true, italic: true, underline: "wavy" }),
    ).toEqual({
      color: "#111",
      backgroundColor: "#222",
      fontWeight: "bold",
      fontStyle: "italic",
      textDecoration: "underline wavy",
    });
  });

  it("leaves unset fields undefined", () => {
    expect(tokenStyle({ fg: "#111" })).toEqual({
      color: "#111",
      backgroundColor: undefined,
      fontWeight: undefined,
      fontStyle: undefined,
      textDecoration: undefined,
    });
  });
});

describe("highlightHtmlLines", () => {
  it("returns one balanced HTML row per code.split('\\n') entry", () => {
    const code = "/* one\n two */\nconst s = `a\nb`;\n";
    const lines = highlightHtmlLines(highlighter, code, "typescript", everforestDark);

    expect(lines).toHaveLength(code.split("\n").length);
    expect(lines.at(-1)).toBe("");
    for (const line of lines) {
      expect(line.split("<span").length).toBe(line.split("</span>").length);
    }
  });

  it("drops CRLF terminators", () => {
    const lines = highlightHtmlLines(
      highlighter,
      "const a = 1;\r\nconst b = 2;",
      "typescript",
      everforestDark,
    );

    expect(lines).toHaveLength(2);
    expect(lines.join("")).not.toContain("\r");
  });

  it("escapes markup in the source", () => {
    const [line] = highlightHtmlLines(
      highlighter,
      'const s = "<script>&";',
      "typescript",
      everforestDark,
    );

    expect(line).toContain("&lt;script&gt;&amp;");
    expect(line).not.toContain("<script>");
  });

  it("renders plain text for the text fallback language", () => {
    expect(highlightHtmlLines(highlighter, "a <b>\nc", "text", everforestDark)).toEqual([
      "a &lt;b&gt;",
      "c",
    ]);
  });

  // The home composer paints highlightTokenLines through tokenStyle and the
  // saved view injects highlightHtmlLines; a character must look the same in both.
  it("paints every character the way the composer tokens do", () => {
    const code = [
      'import { readFile } from "node:fs";',
      "// italic comment",
      "export async function load(path: string): Promise<string> {",
      "  return `${await readFile(path)}`;",
      "}",
    ].join("\r\n");
    const htmlLines = highlightHtmlLines(highlighter, code, "typescript", everforestDark);
    const tokenLines = highlightTokenLines(highlighter, code, "typescript", everforestDark);
    const { document } = new Window();

    htmlLines.forEach((html, row) => {
      const cell = document.createElement("div");
      cell.innerHTML = html;
      const fromHtml: string[] = [];
      const walk = (node: Node, style: string) => {
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            for (const char of child.textContent ?? "") fromHtml.push(`${char}|${style}`);
          } else {
            const own = (child as unknown as HTMLElement).getAttribute("style");
            walk(child as unknown as Node, own ?? style);
          }
        });
      };
      walk(cell as unknown as Node, "");

      const fromTokens = tokenLines[row]!.flatMap((token) => {
        const css = tokenStyle(token.style);
        const expected = [
          css?.color && `color: ${css.color};`,
          css?.backgroundColor && `background-color: ${css.backgroundColor};`,
          css?.fontWeight && "font-weight: bold;",
          css?.fontStyle && "font-style: italic;",
          css?.textDecoration && `text-decoration: ${css.textDecoration};`,
        ]
          .filter(Boolean)
          .join(" ");
        return [...token.text].map((char) => `${char}|${expected}`);
      });

      expect(fromHtml).toEqual(fromTokens);
    });
    expect(htmlLines[1]).toContain("font-style: italic;");
  });

  // Known Lumis gap: a scope the theme leaves unstyled, nested in one it styles,
  // inherits the outer color in HTML (as Neovim's stacked highlights do), but
  // highlightIter reports only the innermost scope's style. Here the `x` inside
  // the f-string is string-green in the saved view and uncolored in the
  // composer. Flips once highlightIter resolves the enclosing style
  // (leandrocp/lumis#1592).
  it.fails("colors an unstyled nested scope like its enclosing one", () => {
    const [line] = highlightTokenLines(highlighter, 'y = f"{x}"', "python", doomOneDark);
    const inner = line!.find((token) => token.text === "x");

    expect(inner?.style?.fg).toBe(doomOneDark.highlights.string?.fg);
  });
});

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
  const annotations = lineAnnotations(code, overlaysByLine);
  const formatter = lineFormatter<Overlay>("javascript", theme);
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

  it("keeps an overlay on a blank line, which Lumis composes as a point", async () => {
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
        { range: { type: "offset", start: 6, end: 14 }, data: { kind: "outer", line: 1 } },
        { range: { type: "offset", start: 10, end: 20 }, data: { kind: "inner", line: 1 } },
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
          data: { kind: "block", line: 1 },
        },
      ],
    });

    expect(formatter.lines.map((l) => l.overlays)).toEqual([
      [{ kind: "block", line: 1 }],
      [{ kind: "block", line: 1 }],
      [{ kind: "block", line: 1 }],
    ]);
  });

  it("ignores event kinds it does not render, such as decorations", async () => {
    // Lumis adds event kinds as it grows and documents that a formatter must
    // skip the ones it does not know. Rainbow brackets emit decorationStart /
    // decorationEnd, which carry no source range: treating them as source
    // events decodes the whole buffer and duplicates the file into the line.
    const code = "const pair = [one, (two)];";
    const highlighter = await highlighterPromise;
    const formatter = lineFormatter<Overlay>("javascript", theme);
    highlighter.highlight(code, formatter, { rainbowBrackets: true });

    expect(formatter.lines).toHaveLength(1);
    expect(textOf(formatter.lines[0]!)).toBe(code);
  });
});

describe("lineAnnotations", () => {
  it("measures the end column in UTF-8 bytes, not characters", async () => {
    const code = "const wave = '👋';";
    const annotations = lineAnnotations(code, { 1: { kind: "r", line: 1 } });

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
    const annotations = lineAnnotations("const a = 1;\r\nx", { 1: { kind: "r", line: 1 } });

    expect(annotations[0]!.range).toMatchObject({ end: { line: 0, column: 13 } });
  });

  it("gives a blank line an empty range, which Lumis reads as a point", () => {
    const annotations = lineAnnotations("a\n\nb", {
      1: { kind: "r", line: 1 },
      2: { kind: "r", line: 2 },
    });

    expect(annotations).toHaveLength(2);
    expect(annotations[1]!.range).toEqual({
      type: "position",
      start: { line: 1, column: 0 },
      end: { line: 1, column: 0 },
    });
  });

  it("ignores a line number past the end of the source", () => {
    expect(lineAnnotations("a\nb", { 99: { kind: "r", line: 99 } })).toEqual([]);
  });
});

// Both data renderers remain in use: styled tokens for the editor/export and
// annotated rows for comments. Keep their scope resolution and CRLF rules equal.
describe("annotated line rendering parity", () => {
  it("resolves language-specific styles like highlightIter", () => {
    const code = 'import { x } from "y";';
    const formatter = lineFormatter("typescript", everforestDark);
    highlighter.highlight(code, formatter);
    const token = formatter.lines[0]!.tokens.find((part) => part.text === "import");
    expect(token?.color).toBe(everforestDark.highlights["keyword.import.typescript"]?.fg);
  });

  it("strips a CRLF even when its CR and LF occur in separate events", () => {
    const formatter = lineFormatter("typescript", everforestDark);
    formatter.render("a\r\nb", [
      { type: "source", start: 0, end: 2 },
      { type: "source", start: 2, end: 4 },
    ]);
    expect(formatter.lines.map((line) => line.tokens.map((token) => token.text).join(""))).toEqual([
      "a",
      "b",
    ]);
  });
});

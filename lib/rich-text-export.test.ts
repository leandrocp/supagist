// Runs the real Lumis highlighter: the builder exists to carry Lumis's resolved
// colours into pasted HTML, so a mocked highlighter would only test the mock.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { createHighlighter, type Highlighter } from "@lumis-sh/lumis";
import githubLight from "@lumis-sh/themes/github_light";
import doomOneDark from "@lumis-sh/themes/doom_one_dark";
import { highlightTokenLines } from "@/lib/lumis-lines";
import { copyRichText, richTextHtml } from "@/lib/rich-text-export";

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await createHighlighter({ languages: [] });
  await highlighter.loadLanguage("typescript");
});

function parse(html: string) {
  const document = new Window().document;
  document.body.innerHTML = html;
  const block = document.body.querySelector("div") as unknown as HTMLDivElement;
  return { block, rows: Array.from(block.children) as HTMLElement[] };
}

describe("richTextHtml", () => {
  const code = 'import x from "y";\r\n\r\nconst a = 1 < 2 && "<b>";\r\n';
  const html = () =>
    richTextHtml(highlightTokenLines(highlighter, code, "typescript", githubLight), {
      theme: githubLight,
      fontId: "jetbrains",
      fontSize: 18,
    });

  it("keeps one row per source line, with blank lines and no stray CR", () => {
    const { rows } = parse(html());
    expect(rows.map((row) => row.textContent)).toEqual([
      'import x from "y";',
      "",
      'const a = 1 < 2 && "<b>";',
      "",
    ]);
    // A blank row needs a <br>, or Slides and Docs collapse it away.
    expect(rows[1]!.innerHTML).toBe("<br>");
    expect(html()).not.toContain("\r");
  });

  it("escapes code so markup in the snippet stays text", () => {
    expect(html()).toContain("&lt;b&gt;");
    expect(html()).not.toContain("<b>");
  });

  it("paints the theme background, foreground, and the chosen font on the block", () => {
    const { block } = parse(html());
    const normal = githubLight.highlights.normal as { fg: string; bg: string };
    const style = block.getAttribute("style")!;
    expect(style).toContain(`background-color:${normal.bg}`);
    expect(style).toContain(`color:${normal.fg}`);
    expect(style).toContain(`font-family:"JetBrains Mono",Menlo,Consolas,"Courier New",monospace`);
    expect(style).toContain("font-size:18px");
    expect(style).toContain("white-space:pre");
  });

  it("colours each token with the colour Lumis resolved for it", () => {
    const tokens = highlightTokenLines(highlighter, code, "typescript", githubLight)[0]!;
    const keyword = tokens.find((token) => token.text === "import")!;
    const string = tokens.find((token) => token.text.includes('"y"'))!;
    expect(keyword.style?.fg).toBeTruthy();
    expect(keyword.style?.fg).not.toBe(string.style?.fg);

    const spans = Array.from(parse(html()).rows[0]!.querySelectorAll("span"));
    const styleOf = (text: string) =>
      spans.find((span) => span.textContent === text)!.getAttribute("style");
    expect(styleOf("import")).toContain(`color:${keyword.style!.fg}`);
    expect(styleOf(string.text)).toContain(`color:${string.style!.fg}`);
  });

  it("follows the theme rather than one hard-coded palette", () => {
    const dark = richTextHtml(highlightTokenLines(highlighter, code, "typescript", doomOneDark), {
      theme: doomOneDark,
    });
    const normal = doomOneDark.highlights.normal as { bg: string };
    expect(parse(dark).block.getAttribute("style")).toContain(`background-color:${normal.bg}`);
    // The system font stack is used as-is, with no web font name in front.
    expect(parse(dark).block.getAttribute("style")).toContain(
      "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    );
  });

  it("carries bold, italic and per-token backgrounds that differ from the editor", () => {
    const out = richTextHtml(
      [
        [
          { text: "b", scope: "x", style: { fg: "#111111", bold: true } },
          { text: "i", scope: "x", style: { fg: "#222222", italic: true } },
          { text: "h", scope: "x", style: { fg: "#333333", bg: "#ffeeee" } },
          { text: "same", scope: "x", style: { fg: "#444444", bg: "#ffffff" } },
        ],
      ] as never,
      { theme: githubLight },
    );
    const spans = Array.from(parse(out).rows[0]!.querySelectorAll("span"));
    expect(spans[0]!.getAttribute("style")).toBe("color:#111111;font-weight:bold");
    expect(spans[1]!.getAttribute("style")).toBe("color:#222222;font-style:italic");
    expect(spans[2]!.getAttribute("style")).toBe("color:#333333;background-color:#ffeeee");
    // github_light's editor bg is #ffffff, so repeating it per token is noise.
    expect(spans[3]!.getAttribute("style")).toBe("color:#444444");
  });
});

describe("copyRichText", () => {
  const payload = { html: "<div>x</div>", text: "x" };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes text/html and text/plain in one ClipboardItem", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    class FakeClipboardItem {
      constructor(public items: Record<string, Promise<Blob>>) {}
    }
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", { clipboard: { write } });

    await copyRichText(Promise.resolve(payload));

    const [[[item]]] = write.mock.calls as [[[FakeClipboardItem]]];
    expect(Object.keys(item.items)).toEqual(["text/html", "text/plain"]);
    const html = await item.items["text/html"]!;
    expect(html.type).toBe("text/html");
    expect(await html.text()).toBe(payload.html);
    expect(await (await item.items["text/plain"]!).text()).toBe("x");
  });

  it("falls back to a copy event carrying both flavours without ClipboardItem", async () => {
    const window = new Window();
    const data = new Map<string, string>();
    const writeText = vi.fn();
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", window.document);
    window.document.execCommand = () => {
      const event = new window.Event("copy") as unknown as ClipboardEvent;
      Object.defineProperty(event, "clipboardData", {
        value: { setData: (type: string, value: string) => data.set(type, value) },
      });
      window.document.dispatchEvent(event as never);
      return true;
    };

    await copyRichText(Promise.resolve(payload));

    expect(Object.fromEntries(data)).toEqual({ "text/html": payload.html, "text/plain": "x" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies plain text when the copy event cannot run", async () => {
    const window = new Window();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", window.document);
    window.document.execCommand = () => false;

    await copyRichText(Promise.resolve(payload));

    expect(writeText).toHaveBeenCalledWith("x");
  });
});

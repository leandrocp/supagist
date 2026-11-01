// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportModal, type ExportSettings } from "./export-modal";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from "../lib/export-metadata";

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/export-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/export-utils")>();
  return {
    ...actual,
    createHighlightedSvg: vi.fn(async () => '<svg width="420" height="120"></svg>'),
    renderToFile: vi.fn(async () => new File(["png"], "snippet.png", { type: "image/png" })),
    triggerDownload: vi.fn(),
  };
});

vi.mock("@/lib/rich-text-export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/rich-text-export")>();
  return {
    ...actual,
    createRichTextClipboard: vi.fn(async () => ({ html: "<div>rich</div>", text: "plain" })),
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const settings: ExportSettings = {
  background: null,
  outerPadding: 64,
  innerPadding: 16,
  cornerRadius: 12,
  pixelRatio: 4,
  lineNumbers: false,
  showReactions: false,
  showComments: false,
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
  windowDecoration: "macos",
  fontId: "system",
  fontSize: 14,
  language: null,
  aspectRatio: null,
  ligatures: true,
};

describe("ExportModal", () => {
  it("copies the snippet as rich text with the current theme and font settings", async () => {
    const { createRichTextClipboard } = await import("@/lib/rich-text-export");
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public items: Record<string, Promise<Blob>>) {}
      },
    );
    Object.defineProperty(navigator, "clipboard", { value: { write }, configurable: true });

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="fn main() {}"
        filename="main.rs"
        theme="dracula"
        settings={{ ...settings, fontId: "fira", fontSize: 18, language: "rust" }}
        onSettingsChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy as rich text" }));

    await screen.findByRole("button", { name: "Copied" });
    expect(createRichTextClipboard).toHaveBeenCalledWith("fn main() {}", "main.rs", "dracula", {
      fontId: "fira",
      fontSize: 18,
      language: "rust",
    });
    const [[[item]]] = write.mock.calls as [[[{ items: Record<string, Promise<Blob>> }]]];
    expect(await (await item.items["text/html"]!).text()).toBe("<div>rich</div>");
    expect(await (await item.items["text/plain"]!).text()).toBe("plain");
  });

  it("renders the export preview at the selected font size", async () => {
    const { createHighlightedSvg } = await import("@/lib/export-utils");

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={{ ...settings, fontSize: 20 }}
        onSettingsChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(vi.mocked(createHighlightedSvg).mock.calls.at(-1)?.[24]).toBe(20);
    });
  });

  it("redraws the preview when the comments toggle changes", async () => {
    // The toggle changes the exported file, so leaving it out of the preview
    // effect's dependencies left an open preview showing the old card.
    const { createHighlightedSvg } = await import("@/lib/export-utils");
    vi.mocked(createHighlightedSvg).mockClear();
    const showComments = (call: unknown[] | undefined) => call?.[17];

    const props = {
      onClose: vi.fn(),
      code: "console.log('hello')",
      filename: "snippet.ts",
      theme: "github_dark",
      comments: { 1: { author: "dev", body: "note" } },
      onSettingsChange: vi.fn(),
    };

    const { rerender } = render(
      <ExportModal open {...props} settings={{ ...settings, showComments: false }} />,
    );

    await waitFor(() => {
      expect(showComments(vi.mocked(createHighlightedSvg).mock.calls.at(-1))).toBe(false);
    });

    rerender(<ExportModal open {...props} settings={{ ...settings, showComments: true }} />);

    await waitFor(() => {
      expect(showComments(vi.mocked(createHighlightedSvg).mock.calls.at(-1))).toBe(true);
    });
  });

  it("keeps the sealed appearance and only offers scale and comments", async () => {
    // A published snippet is sealed: Export must not restyle it.
    const { createHighlightedSvg, renderToFile } = await import("@/lib/export-utils");
    const sealed: ExportSettings = {
      ...settings,
      background: "Forest",
      aspectRatio: "16:9",
      ligatures: false,
      windowDecoration: "windows",
    };
    const onSettingsChange = vi.fn();
    const props = {
      onClose: vi.fn(),
      code: "x |> y",
      filename: "demo.ex",
      theme: "github_dark",
      comments: { 1: { author: "dev", body: "note" } },
      onSettingsChange,
    };
    const { rerender } = render(<ExportModal open {...props} settings={sealed} />);

    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.queryByRole("switch", { name: "Show line numbers" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Show footer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Minimal" })).toBeNull();
    expect(screen.queryByLabelText("Font size")).toBeNull();
    expect(screen.getByRole("switch", { name: "Show comments" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "2x" }));
    expect(onSettingsChange).toHaveBeenLastCalledWith({ ...sealed, pixelRatio: 2 });

    rerender(<ExportModal open {...props} settings={{ ...sealed, pixelRatio: 2 }} />);
    await waitFor(() => {
      expect(vi.mocked(createHighlightedSvg).mock.calls.at(-1)?.slice(26)).toEqual(["16:9", false]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Save as PNG" }));
    await waitFor(() => {
      const call = vi.mocked(renderToFile).mock.calls.at(-1)!;
      expect(call[6]).toBe(2);
      expect(call[7]?.label).toBe("Forest");
      expect(call[21]).toBe("windows");
      expect(call.slice(27)).toEqual(["16:9", false]);
    });
  });
});

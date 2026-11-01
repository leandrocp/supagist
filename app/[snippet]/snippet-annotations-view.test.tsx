// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SnippetAnnotationsView } from "./snippet-annotations-view";
import { applyBrandPreset, getBrandPreset } from "@/lib/brand-presets";
import {
  DEFAULT_SNIPPET_APPEARANCE,
  parseSnippetAppearance,
  type SnippetAppearance,
} from "@/lib/snippet-appearance";

// Realtime and auth are external I/O for this test: every call on the client
// resolves to an empty result, so the view renders without a live backend.
vi.mock("@/lib/supabase/client", () => {
  const chain: unknown = new Proxy(function () {}, {
    get: (_target, prop) =>
      prop === "then"
        ? (resolve: (value: unknown) => void) => resolve({ data: [], error: null })
        : chain,
    apply: () => chain,
  });
  return { createClient: () => chain };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/abc" }));

vi.mock("@/lib/rich-text-export", () => ({
  createRichTextClipboard: vi.fn(async () => ({ html: "<div>rich</div>", text: "plain" })),
  copyRichText: vi.fn(async (payload: Promise<unknown>) => {
    await payload;
  }),
}));

afterEach(() => {
  cleanup();
});

it("copies the saved snippet as rich text with its own theme, font and language", async () => {
  const { copyRichText, createRichTextClipboard } = await import("@/lib/rich-text-export");

  render(
    <SnippetAnnotationsView
      snippetId="s1"
      filename="main.rs"
      code={"fn main() {}\n"}
      language="rust"
      snippetUrl="https://supagist.app/abc"
      snippetTheme="dracula"
      fontId="fira"
      snippetReactions={{}}
      preRenderedLines={["fn main() {}", ""]}
      themeIsDark
      themeBg="#282a36"
      themeFg="#f8f8f2"
      currentUserId={null}
      author={null as never}
      appearance={{ ...DEFAULT_SNIPPET_APPEARANCE, fontSize: 18 }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Copy as rich text" }));

  expect(await screen.findByText("Copied")).toBeTruthy();
  expect(createRichTextClipboard).toHaveBeenCalledWith("fn main() {}\n", "main.rs", "dracula", {
    fontId: "fira",
    fontSize: 18,
    language: "rust",
  });
  expect(copyRichText).toHaveBeenCalledTimes(1);
});

function renderSaved(appearance: SnippetAppearance) {
  return render(
    <SnippetAnnotationsView
      snippetId="s1"
      filename="greet.ts"
      code={"const a = 1 => 2;\nconsole.log(a);"}
      language="typescript"
      snippetUrl="https://supagist.app/abc"
      snippetTheme="lumis-paper"
      fontId="jetbrains"
      snippetReactions={{}}
      preRenderedLines={["const a = 1 => 2;", "console.log(a);"]}
      themeIsDark={false}
      themeBg="#FBFAF7"
      themeFg="#1B1F3B"
      currentUserId={null}
      author={null as never}
      appearance={appearance}
    />,
  );
}

it("shows a snippet published on the Lumis canvas with its canvas, frame and header", () => {
  // Regression: the saved view dropped the composed canvas and brand frame.
  const lumis = getBrandPreset("lumis")!;
  renderSaved(parseSnippetAppearance(applyBrandPreset(DEFAULT_SNIPPET_APPEARANCE, lumis)));

  const canvas = screen.getByTestId("snippet-canvas");
  expect(canvas.dataset.background).toBe("Lumis");
  expect(canvas.getAttribute("style")).toContain("padding: min(128px, 10vw)");
  expect(screen.getByTestId("preview-brand-layers")).toBeTruthy();

  const card = screen.getByTestId("snippet-card");
  expect(card.style.backgroundColor.toLowerCase()).toBe("#ffffff");
  expect(card.style.borderRadius).toBe("8px");
  expect(card.style.fontVariantLigatures).toBe("none");

  // The Lumis bar replaces the macOS chrome and still carries the actions.
  const bar = screen.getByTestId("lumis-window-header");
  expect(bar.textContent).toContain("greet.ts");
  expect(bar.textContent).toContain("< TypeScript />");
  expect(bar.querySelector('[aria-label="Copy code"]')).toBeTruthy();
  // Lumis turns line numbers off.
  expect(screen.queryByText("2", { selector: "span.tabular-nums" })).toBeNull();
});

it("keeps snippets published without appearance on the plain macOS card", () => {
  renderSaved(parseSnippetAppearance(null));
  expect(screen.queryByTestId("snippet-canvas")).toBeNull();
  expect(screen.queryByTestId("lumis-window-header")).toBeNull();
  const card = screen.getByTestId("snippet-card");
  expect(card.style.backgroundColor.toLowerCase()).toBe("#fbfaf7");
  expect(card.style.fontVariantLigatures).toBe("");
  expect(screen.getByText("greet.ts")).toBeTruthy();
});

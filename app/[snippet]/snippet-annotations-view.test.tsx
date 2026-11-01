// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SnippetAnnotationsView } from "./snippet-annotations-view";

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
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Copy as rich text" }));

  expect(await screen.findByText("Copied")).toBeTruthy();
  expect(createRichTextClipboard).toHaveBeenCalledWith("fn main() {}\n", "main.rs", "dracula", {
    fontId: "fira",
    language: "rust",
  });
  expect(copyRichText).toHaveBeenCalledTimes(1);
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeComposer } from "./home-composer";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockInlineCodeBlock({
      style,
      footer,
      innerPadding,
      showGutter,
      showLineNumbers,
      reactions,
      onPickReaction,
      windowDecoration,
      brandFrame,
      header,
      fontSize,
    }: {
      style?: React.CSSProperties;
      footer?: React.ReactNode;
      innerPadding?: number;
      fontSize?: number;
      showGutter?: boolean;
      showLineNumbers?: boolean;
      reactions?: Record<number, string>;
      onPickReaction?: (lineNumber: number, emoji: string) => void;
      windowDecoration?: string;
      brandFrame?: { headerStrip?: { showLanguage?: boolean }; cardFill?: string };
      header?: {
        enabled: boolean;
        showFilename: boolean;
        showLanguage: boolean;
        filenamePosition: string;
        languagePosition: string;
      };
    }) {
      return (
        <div
          data-testid="code-preview"
          data-inner-padding={innerPadding}
          data-font-size={fontSize}
          data-show-gutter={showGutter}
          data-show-line-numbers={showLineNumbers}
          data-reactions={JSON.stringify(reactions)}
          data-window-decoration={windowDecoration}
          data-brand-card-fill={brandFrame?.cardFill}
          data-brand-header={brandFrame?.headerStrip ? "true" : "false"}
          data-header-enabled={header?.enabled}
          data-header-filename={header?.showFilename}
          data-header-language={header?.showLanguage}
          data-header-filename-position={header?.filenamePosition}
          data-header-language-position={header?.languagePosition}
          style={style}
        >
          <button type="button" onClick={() => onPickReaction?.(1, "🔥")}>
            Mock add reaction
          </button>
          <textarea aria-label="Code" />
          {footer ? <div data-testid="preview-footer">{footer}</div> : null}
        </div>
      );
    },
}));

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@lumis-sh/lumis/client", async (importOriginal) => ({
  guessLanguage: (await importOriginal<typeof import("@lumis-sh/lumis/client")>()).guessLanguage,
  availableThemes: () => [{ name: "github_light" }, { name: "github_dark" }],
  availableLanguages: () => [
    { id: "tsx", extensions: ["*.tsx"] },
    { id: "typescript", extensions: ["*.ts"] },
  ],
}));

vi.mock("@/lib/lumis-client", () => ({}));

vi.mock("@/components/theme-picker", () => ({
  ThemePicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button
      aria-label="Theme"
      onClick={() => onChange(value === "github_light" ? "github_dark" : "github_light")}
    >
      {value}
    </button>
  ),
}));

const publishSnippet = vi.hoisted(() => vi.fn(async (_form: FormData) => ({ error: "stop" })));
vi.mock("@/app/actions/publish", () => ({ publishSnippet }));
vi.mock("@/lib/snippet-images", () => ({
  createDraftPng: vi.fn(),
  createDraftSvg: vi.fn(),
  createSnippetImages: vi.fn(async () => ({
    canonical: new Blob(["png"]),
    og: new Blob(["png"]),
    svg: new Blob(["<svg/>"]),
    card: new Blob(["png"]),
  })),
}));

vi.mock("@/components/home-presence", () => ({ HomePresence: () => null }));
vi.mock("@/components/user-avatar", () => ({ UserAvatar: () => null }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.querySelector(".intro-env")?.remove();
});

describe("HomeComposer controls", () => {
  it("publishes public by default, or private when the author picks it", async () => {
    render(<HomeComposer />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await vi.waitFor(() => expect(publishSnippet).toHaveBeenCalledTimes(1));
    expect(publishSnippet.mock.calls[0]![0].get("visibility")).toBe("public");

    // Radix opens menus on pointerdown; the keyboard path works under happy-dom.
    fireEvent.keyDown(screen.getByRole("button", { name: "Choose who can see it" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Private/ }));
    fireEvent.click(screen.getByRole("button", { name: "Publish private" }));
    await vi.waitFor(() => expect(publishSnippet).toHaveBeenCalledTimes(2));
    expect(publishSnippet.mock.calls[1]![0].get("visibility")).toBe("private");
  });

  it("seals and sends the published snippet in the big envelope, then opens its page", async () => {
    publishSnippet.mockResolvedValueOnce({ path: "/hello-tsx-abc123" } as never);
    render(<HomeComposer />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    const envelope = await screen.findByTestId("send-envelope");
    expect(envelope.querySelector(".hero-card-file")?.textContent).toBe("snippet.tsx");
    expect(router.prefetch).toHaveBeenCalledWith("/hello-tsx-abc123");
    expect(router.push).not.toHaveBeenCalled();
    // Publish stays busy while the letter is on its way.
    expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(true);
    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith("/hello-tsx-abc123"), {
      timeout: 4000,
    });
  });

  it("uses the wax primary for Publish and keeps the preview gutter", () => {
    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").getAttribute("data-show-gutter")).toBe("true");
    expect(screen.getByTestId("code-preview").getAttribute("data-show-line-numbers")).toBe("false");
    expect(screen.getByRole("button", { name: "Publish" }).getAttribute("data-variant")).toBe(
      "default",
    );
  });

  it("renders no header bar of its own — the app nav is the only one", () => {
    const { container } = render(<HomeComposer />);

    // The composer used to stack its own title/presence bar under the app nav.
    // Its content now lives in the single nav in app/page.tsx.
    expect(screen.queryByRole("heading", { name: "Create a snippet" })).toBeNull();
    expect(screen.queryByText("Realtime code sharing, powered by Supabase")).toBeNull();
    expect(screen.queryByText("Log in to save snippets.")).toBeNull();

    // The shell's first child is the editor grid, not a chrome row.
    const shell = screen.getByTestId("composer-shell");
    expect(shell.firstElementChild?.getAttribute("data-testid")).toBe("composer-main");
    expect(container.querySelector("nav")).toBeNull();
  });

  it("shows only the basic options on the home teaser and links to the full editor", () => {
    render(<HomeComposer />);

    for (const name of ["Brand", "Theme"]) {
      expect(screen.getByText(name, { selector: "span" })).toBeTruthy();
    }
    // Background follows Brand or Theme; picking one by hand is in All options.
    expect(screen.queryByText("Background", { selector: "span" })).toBeNull();
    expect(screen.getByLabelText("Filename")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Font" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Header" })).toBeNull();
    expect(screen.getByRole("link", { name: "All options" }).getAttribute("href")).toBe("/compose");
    // The teaser preview spans the page instead of sharing it with a side panel.
    expect(screen.getByTestId("composer-main").className).not.toContain("lg:grid-cols-");
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });

  it("keeps the preview visible while customization scrolls independently", () => {
    render(<HomeComposer full />);

    expect(screen.queryByRole("link", { name: "All options" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Font" })).toBeTruthy();
    expect(screen.getByTestId("composer-shell").className).toContain("lg:h-full");
    expect(screen.getByTestId("composer-main").className).toContain("lg:grid-cols-");
    expect(screen.getByTestId("preview-pane").className).toContain("overflow-auto");
    expect(screen.getByTestId("composer-workspace").className).toContain("overflow-hidden");
    expect(screen.getByTestId("customization-scroll").className).toContain("min-h-0");
    expect(screen.getByTestId("composer-actions").className).toContain("shrink-0");
    expect(screen.getByTestId("composer-actions").className).not.toContain("sticky");
  });

  it("applies a complete Brand preset while keeping Theme independently editable", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.click(screen.getByText("Tailwind"));

    expect(screen.getByRole("button", { name: "Brand" }).textContent).toContain("Tailwind");
    expect(screen.getByRole("button", { name: "Theme" }).textContent).toContain("github_light");
    expect(screen.getByTestId("code-preview").getAttribute("data-window-decoration")).toBe(
      "macos-subtle",
    );
    expect(screen.getByTestId("code-preview").style.borderRadius).toBe("8px");
    expect(screen.getByTestId("code-preview").style.maxWidth).toBe("100%");
    expect(screen.getByTestId("code-preview").parentElement?.className).toContain("box-border");
    expect(screen.getByTestId("code-preview").style.boxShadow).toContain(
      "inset 0 1px 0 rgba(255,255,255,0.95)",
    );
    expect(screen.getByTestId("preview-brand-decoration").getAttribute("data-scene-guide")).toBe(
      "crosshair",
    );
    expect(screen.getByTestId("code-preview").parentElement?.style.backgroundImage).toContain(
      "radial-gradient",
    );
    expect(screen.queryByTestId("preview-footer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));

    expect(screen.getByRole("button", { name: "Theme" }).textContent).toContain("github_dark");
    expect(screen.getByRole("button", { name: "Brand" }).textContent).toContain("Custom");
    // With the Brand gone Custom the background follows the Theme: no canvas.
    expect(screen.queryByTestId("snippet-canvas")).toBeNull();
    expect(screen.getByTestId("code-preview").getAttribute("data-window-decoration")).toBe(
      "macos-subtle",
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    expect(screen.getByRole("button", { name: "Brand" }).textContent).toContain("Tailwind");
    expect(screen.getByTestId("snippet-canvas").getAttribute("data-background")).toBe("Tailwind");
  });

  it("invites the first edit, then presses the intro seal once per session", () => {
    const envelope = document.body.appendChild(document.createElement("div"));
    envelope.className = "intro-env";
    render(<HomeComposer />);

    const hint = screen.getByTestId("edit-hint");
    expect(hint.textContent).toContain("Click the card and type, or paste your code");
    expect(hint.className).not.toContain("opacity-0");
    expect(screen.getByTestId("preview-pane").querySelector("[data-invite]")).not.toBeNull();
    expect(screen.getByTestId("composer-counts").textContent).toBe(
      "3 lines · 64 / 8,000 characters",
    );

    fireEvent.input(screen.getByLabelText("Code"));
    expect(envelope.hasAttribute("data-pressed")).toBe(true);
    // The hint fades but keeps its space, so the card does not jump.
    expect(hint.className).toContain("opacity-0");
    expect(screen.getByTestId("preview-pane").querySelector("[data-invite]")).toBeNull();

    // Next visit in the same session: no hint, and the seal stays put.
    cleanup();
    envelope.removeAttribute("data-pressed");
    render(<HomeComposer />);
    expect(screen.getByTestId("edit-hint").className).toContain("opacity-0");
    fireEvent.paste(screen.getByLabelText("Code"));
    expect(envelope.hasAttribute("data-pressed")).toBe(false);
  });

  it("puts Background in All options, following Brand until one is picked by hand", () => {
    render(<HomeComposer full />);
    expect(screen.getByText("Follows Theme")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.click(screen.getByText("Supabase"));
    expect(screen.getByText("Follows Brand")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Supabase" }));
    fireEvent.click(screen.getByRole("button", { name: "Sunset" }));
    expect(screen.getByTestId("snippet-canvas").getAttribute("data-background")).toBe("Sunset");
    // A hand-picked background stays through a Brand change.
    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.click(screen.getByText("Vercel"));
    expect(screen.getByRole("button", { name: "Brand" }).textContent).toContain("Vercel");
    expect(screen.getByTestId("snippet-canvas").getAttribute("data-background")).toBe("Sunset");

    fireEvent.click(screen.getByRole("button", { name: "Reset to brand default" }));
    expect(screen.getByTestId("snippet-canvas").getAttribute("data-background")).toBe("Vercel");
    expect(screen.getByText("Follows Brand")).toBeTruthy();
  });

  it("treats a restored draft's background that is not its Brand's own as hand-picked", () => {
    window.localStorage.setItem(
      "supagist:draft:v1",
      JSON.stringify({ theme: "github_dark", background: "Sunset" }),
    );
    render(<HomeComposer full />);
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    expect(screen.getByTestId("snippet-canvas").getAttribute("data-background")).toBe("Sunset");
    expect(screen.getByRole("button", { name: "Reset to theme default" })).toBeTruthy();
  });

  it("passes Brand frame fill and header-strip chrome into the live editor", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.click(screen.getByText("Supabase"));

    expect(screen.getByTestId("code-preview").getAttribute("data-brand-card-fill")).toBe("#171717");
    expect(screen.getByTestId("code-preview").getAttribute("data-brand-header")).toBe("true");
  });

  it("groups granular Header and Footer controls in advanced settings", () => {
    render(<HomeComposer full />);

    expect(screen.getByRole("heading", { name: "Header" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Footer" })).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "Show header filename" }));
    expect(screen.getByTestId("code-preview").getAttribute("data-header-filename")).toBe("false");

    expect(screen.getByTestId("code-preview").getAttribute("data-header-filename-position")).toBe(
      "center",
    );
    expect(screen.getByTestId("code-preview").getAttribute("data-header-language-position")).toBe(
      "right",
    );

    fireEvent.click(screen.getByRole("radio", { name: "left aligned filename" }));
    expect(screen.getByTestId("code-preview").getAttribute("data-header-filename-position")).toBe(
      "left",
    );
    expect(screen.getByTestId("code-preview").getAttribute("data-header-language-position")).toBe(
      "right",
    );

    fireEvent.click(screen.getByRole("switch", { name: "Show footer" }));
    const footer = screen.getByTestId("preview-footer");
    expect(within(footer).getByText("github_light")).toBeTruthy();
    expect(within(footer).getByText("3 lines")).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "Show footer theme" }));
    expect(within(screen.getByTestId("preview-footer")).queryByText("github_light")).toBeNull();
  });

  it("offers separate Minimal and macOS Subtle window styles", () => {
    render(<HomeComposer full />);
    fireEvent.click(screen.getByRole("combobox", { name: "Window" }));

    expect(screen.getByRole("option", { name: "Minimal" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "macOS Subtle" })).toBeTruthy();
  });

  it("offers a font size picker next to the font picker", () => {
    render(<HomeComposer full />);

    expect(screen.getByRole("combobox", { name: "Font" }).textContent).toBe("System");
    expect(screen.getByRole("combobox", { name: "Font size" }).textContent).toBe("14px");

    fireEvent.click(screen.getByRole("combobox", { name: "Font size" }));
    expect(screen.getByRole("option", { name: "12px" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "20px" })).toBeTruthy();
  });

  it("restores a persisted font size and forwards it to the preview", () => {
    window.localStorage.setItem("supagist:draft:v1", JSON.stringify({ fontSize: 20 }));

    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").getAttribute("data-font-size")).toBe("20");
  });

  it("toggles ligatures and the 16:9 size, reflected in the live preview", () => {
    render(<HomeComposer full />);
    const preview = () => screen.getByTestId("code-preview");
    const canvas = () => preview().parentElement!;
    expect(preview().style.fontVariantLigatures).toBe("");
    expect(canvas().style.aspectRatio).toBe("");
    fireEvent.click(screen.getByRole("switch", { name: "Ligatures" }));
    expect(preview().style.fontVariantLigatures).toBe("none");

    expect(screen.getByRole("combobox", { name: "Size" }).textContent).toBe("Fit to code");
    fireEvent.click(screen.getByRole("combobox", { name: "Size" }));
    fireEvent.click(screen.getByRole("option", { name: "16:9 (1600×900)" }));
    expect(canvas().style.aspectRatio).toBe("16 / 9");
    expect(screen.getByText(/1600 × 900/)).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem("supagist:draft:v1")!)).toMatchObject({
      aspectRatio: "16:9",
      ligatures: false,
    });
  });

  it("restores persisted 16:9 and ligatures-off settings", () => {
    window.localStorage.setItem(
      "supagist:draft:v1",
      JSON.stringify({ aspectRatio: "16:9", ligatures: false }),
    );

    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").style.fontVariantLigatures).toBe("none");
    expect(screen.getByTestId("code-preview").parentElement!.style.aspectRatio).toBe("16 / 9");
  });

  it("snaps an unsupported persisted font size to a supported one", () => {
    window.localStorage.setItem("supagist:draft:v1", JSON.stringify({ fontSize: 15 }));

    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").getAttribute("data-font-size")).toBe("16");
  });

  it("migrates a legacy synthetic brand theme to an official Lumis theme", () => {
    window.localStorage.setItem("supagist:draft:v1", JSON.stringify({ theme: "supabase-dark" }));

    render(<HomeComposer />);

    expect(screen.getByRole("button", { name: "Theme" }).textContent).toContain("github_dark");
  });

  it("migrates the old Minimal window style to macOS Subtle", () => {
    window.localStorage.setItem(
      "supagist:draft:v1",
      JSON.stringify({ windowDecoration: "minimal" }),
    );

    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").getAttribute("data-window-decoration")).toBe(
      "macos-subtle",
    );
  });

  it("keeps each visible-detail switch associated with its label", () => {
    render(<HomeComposer full />);

    const lineNumbers = screen.getByRole("switch", { name: "Line numbers" });
    expect(lineNumbers.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByText("Line numbers"));

    expect(lineNumbers.getAttribute("aria-checked")).toBe("true");
    expect(lineNumbers.closest("label")?.className).toContain("w-fit");
  });

  it("enables reaction visibility when a reaction is added", () => {
    render(<HomeComposer full />);
    const reactions = screen.getByRole("switch", { name: "Reactions" });
    expect(reactions.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Mock add reaction" }));

    expect(reactions.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("code-preview").getAttribute("data-reactions")).toBe(
      JSON.stringify({ 1: "🔥" }),
    );
  });

  it("uses an outer-padding slider that supports zero", () => {
    render(<HomeComposer full />);

    fireEvent.click(screen.getByRole("button", { name: "None" }));
    fireEvent.click(screen.getByRole("button", { name: "Forest" }));

    const outerPaddingSlider = screen.getByRole("slider", { name: "Outer padding" });
    expect(outerPaddingSlider.getAttribute("aria-valuemin")).toBe("0");
    expect(outerPaddingSlider.getAttribute("aria-valuemax")).toBe("5");

    fireEvent.keyDown(outerPaddingSlider, { key: "End" });
    expect(screen.getByText("128px")).toBeTruthy();

    fireEvent.keyDown(outerPaddingSlider, { key: "ArrowLeft" });
    expect(screen.getByText("96px")).toBeTruthy();

    fireEvent.keyDown(outerPaddingSlider, { key: "Home" });
    expect(screen.getByText("0px")).toBeTruthy();
  });

  it("applies configurable inner padding to the preview", () => {
    render(<HomeComposer full />);

    const innerPaddingSlider = screen.getByRole("slider", { name: "Inner padding" });
    expect(screen.getByTestId("code-preview").getAttribute("data-inner-padding")).toBe("16");

    fireEvent.keyDown(innerPaddingSlider, { key: "End" });
    expect(screen.getByText("48px")).toBeTruthy();
    expect(screen.getByTestId("code-preview").getAttribute("data-inner-padding")).toBe("48");
  });

  it("controls preview corner radius from square to 16px", () => {
    render(<HomeComposer full />);

    const radiusSlider = screen.getByRole("slider", { name: "Corner radius" });
    expect(radiusSlider.getAttribute("aria-valuemax")).toBe("4");
    expect(screen.getByTestId("code-preview").style.borderRadius).toBe("12px");

    fireEvent.keyDown(radiusSlider, { key: "End" });
    expect(radiusSlider.getAttribute("aria-valuenow")).toBe("4");
    expect(screen.getByTestId("code-preview").style.borderRadius).toBe("16px");

    fireEvent.keyDown(radiusSlider, { key: "Home" });

    expect(screen.getByText("0px")).toBeTruthy();
    expect(screen.getByTestId("code-preview").style.borderRadius).toBe("0px");
  });

  it("keeps long theme names on a single footer row", async () => {
    window.localStorage.setItem(
      "supagist:draft:v1",
      JSON.stringify({ theme: "kanagawabones_dark", showFooter: true }),
    );

    render(<HomeComposer />);

    const footer = await screen.findByTestId("preview-footer");
    const theme = await within(footer).findByText("kanagawabones_dark");

    expect(footer.firstElementChild?.className).toContain("flex-nowrap");
    expect(theme.className).toContain("truncate");
  });

  it("groups secondary export formats behind one equal-weight action", () => {
    render(<HomeComposer />);

    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "PNG image" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PNG image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "SVG image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Source file" })).toBeTruthy();
  });

  it("keeps the code preview within the mobile viewport", () => {
    render(<HomeComposer />);

    expect(screen.getByTestId("code-preview").style.maxWidth).toBe("calc(100vw - 4rem)");
  });
});

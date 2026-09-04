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
          {footer ? <div data-testid="preview-footer">{footer}</div> : null}
        </div>
      );
    },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@lumis-sh/lumis/client", () => ({
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
});

describe("HomeComposer controls", () => {
  it("uses Supabase Studio semantic surfaces and a brand-primary publish action", () => {
    render(<HomeComposer />);

    expect(screen.getByTestId("composer-shell").className).toContain("bg-background-alternative");
    expect(screen.getByTestId("composer-workspace").className).toContain("bg-surface-100");
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

  it("keeps the preview visible while customization scrolls independently", () => {
    render(<HomeComposer />);

    expect(screen.getByTestId("composer-shell").className).toContain("h-[calc(100dvh-4rem)]");
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
    expect(screen.getByRole("button", { name: "Tailwind" })).toBeTruthy();
    expect(screen.getByTestId("code-preview").getAttribute("data-window-decoration")).toBe(
      "macos-subtle",
    );
  });

  it("passes Brand frame fill and header-strip chrome into the live editor", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    fireEvent.click(screen.getByText("Supabase"));

    expect(screen.getByTestId("code-preview").getAttribute("data-brand-card-fill")).toBe("#171717");
    expect(screen.getByTestId("code-preview").getAttribute("data-brand-header")).toBe("true");
  });

  it("groups granular Header and Footer controls in advanced settings", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

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

  it("hides advanced choices until requested", () => {
    render(<HomeComposer />);

    expect(screen.queryByRole("combobox", { name: "Language" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

    expect(screen.getByRole("combobox", { name: "Language" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Scale" })).toBeTruthy();
  });

  it("offers separate Minimal and macOS Subtle window styles", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Window" }));

    expect(screen.getByRole("option", { name: "Minimal" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "macOS Subtle" })).toBeTruthy();
  });

  it("offers a font size picker next to the font picker", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

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
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

    const lineNumbers = screen.getByRole("switch", { name: "Line numbers" });
    expect(lineNumbers.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByText("Line numbers"));

    expect(lineNumbers.getAttribute("aria-checked")).toBe("true");
    expect(lineNumbers.closest("label")?.className).toContain("w-fit");
  });

  it("enables reaction visibility when a reaction is added", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
    const reactions = screen.getByRole("switch", { name: "Reactions" });
    expect(reactions.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Mock add reaction" }));

    expect(reactions.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("code-preview").getAttribute("data-reactions")).toBe(
      JSON.stringify({ 1: "🔥" }),
    );
  });

  it("uses an outer-padding slider that supports zero", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "None" }));
    fireEvent.click(screen.getByRole("button", { name: "Forest" }));
    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

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
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

    const innerPaddingSlider = screen.getByRole("slider", { name: "Inner padding" });
    expect(screen.getByTestId("code-preview").getAttribute("data-inner-padding")).toBe("16");

    fireEvent.keyDown(innerPaddingSlider, { key: "End" });
    expect(screen.getByText("48px")).toBeTruthy();
    expect(screen.getByTestId("code-preview").getAttribute("data-inner-padding")).toBe("48");
  });

  it("controls preview corner radius from square to 16px", () => {
    render(<HomeComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));

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

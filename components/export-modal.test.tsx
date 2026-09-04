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

afterEach(() => {
  cleanup();
});

const settings: ExportSettings = {
  background: null,
  outerPadding: 64,
  innerPadding: 16,
  cornerRadius: 12,
  pixelRatio: 4,
  lineNumbers: false,
  showReactions: false,
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
  windowDecoration: "macos",
  fontId: "system",
  fontSize: 14,
  language: null,
};

describe("ExportModal", () => {
  it("supports zero outer padding through the slider", async () => {
    const onSettingsChange = vi.fn();
    const settingsWithBackground = { ...settings, background: "Forest" };

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settingsWithBackground}
        onSettingsChange={onSettingsChange}
      />,
    );

    const outerPaddingSlider = screen.getByRole("slider", { name: "Outer padding" });
    fireEvent.keyDown(outerPaddingSlider, { key: "Home" });

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...settingsWithBackground,
        outerPadding: 0,
      });
    });
  });

  it("supports configurable inner padding independently", async () => {
    const onSettingsChange = vi.fn();

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const innerPaddingSlider = screen.getByRole("slider", { name: "Inner padding" });
    fireEvent.keyDown(innerPaddingSlider, { key: "End" });

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...settings,
        innerPadding: 48,
      });
    });
  });

  it("supports square corners through the radius slider", async () => {
    const onSettingsChange = vi.fn();

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const radiusSlider = screen.getByRole("slider", { name: "Corner radius" });
    expect(radiusSlider.getAttribute("aria-valuemax")).toBe("4");
    fireEvent.keyDown(radiusSlider, { key: "Home" });

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...settings,
        cornerRadius: 0,
      });
    });
  });

  it("customizes header and footer metadata independently", async () => {
    const onSettingsChange = vi.fn();

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settings}
        onSettingsChange={onSettingsChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Show header language" }));
    expect(onSettingsChange).toHaveBeenCalledWith({
      ...settings,
      header: { ...settings.header, showLanguage: false },
    });

    fireEvent.click(screen.getByRole("radio", { name: "left aligned filename" }));
    expect(onSettingsChange).toHaveBeenCalledWith({
      ...settings,
      header: { ...settings.header, filenamePosition: "left" },
    });

    fireEvent.click(screen.getByRole("radio", { name: "center aligned language" }));
    expect(onSettingsChange).toHaveBeenCalledWith({
      ...settings,
      header: { ...settings.header, languagePosition: "center" },
    });

    fireEvent.click(screen.getByRole("switch", { name: "Show footer" }));
    expect(onSettingsChange).toHaveBeenCalledWith({
      ...settings,
      footer: { ...settings.footer, enabled: true },
    });
  });

  it("changes the code font size alongside the font picker", async () => {
    const onSettingsChange = vi.fn();

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const fontSize = screen.getByLabelText("Font size") as HTMLSelectElement;
    expect(fontSize.value).toBe("14");

    fireEvent.change(fontSize, { target: { value: "20" } });

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, fontSize: 20 });
    });
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
      expect(vi.mocked(createHighlightedSvg).mock.calls.at(-1)?.at(-1)).toBe(20);
    });
  });

  it("updates the saved export window decoration setting", async () => {
    const onSettingsChange = vi.fn();

    render(
      <ExportModal
        open
        onClose={vi.fn()}
        code="console.log('hello')"
        filename="snippet.ts"
        theme="github_dark"
        settings={settings}
        onSettingsChange={onSettingsChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Minimal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "macOS Subtle" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "None" }));

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...settings,
        windowDecoration: "none",
      });
    });
  });
});

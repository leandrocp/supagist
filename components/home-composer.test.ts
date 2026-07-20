import { describe, expect, it } from "vitest";
import {
  getEffectiveViewerLabel,
  getPreviewOuterPadding,
  getPreviewLineCount,
  normalizePersistedWindowDecoration,
  shouldShowPreviewGutter,
} from "./home-composer";

describe("getEffectiveViewerLabel", () => {
  it("keeps the signed-in viewer label when present", () => {
    expect(getEffectiveViewerLabel("leandro", true)).toBe("leandro");
    expect(getEffectiveViewerLabel("leandro", false)).toBe("leandro");
  });

  it("uses a local dev viewer when no viewer is loaded in development", () => {
    expect(getEffectiveViewerLabel(null, true)).toBe("dev");
  });

  it("does not invent a viewer in production", () => {
    expect(getEffectiveViewerLabel(null, false)).toBeNull();
  });
});

describe("getPreviewLineCount", () => {
  it("counts source lines for preview height", () => {
    const code = Array.from({ length: 12 }, (_value, index) => `line ${index + 1}`).join("\n");

    expect(getPreviewLineCount(code)).toBe(12);
  });

  it("adds one truncation row after the export line cap", () => {
    const code = Array.from({ length: 31 }, (_value, index) => `line ${index + 1}`).join("\n");

    expect(getPreviewLineCount(code)).toBe(31);
  });
});

describe("getPreviewOuterPadding", () => {
  it("caps preview outer padding responsively without collapsing desktop values", () => {
    expect(getPreviewOuterPadding(true, 128)).toBe("min(128px, 10vw)");
    expect(getPreviewOuterPadding(true, 96)).not.toBe(getPreviewOuterPadding(true, 128));
  });

  it("removes outer padding when no background is selected", () => {
    expect(getPreviewOuterPadding(false, 128)).toBe(0);
  });

  it("supports explicit zero outer padding with a background", () => {
    expect(getPreviewOuterPadding(true, 0)).toBe(0);
  });
});

describe("normalizePersistedWindowDecoration", () => {
  it("migrates the legacy Minimal style to macOS Subtle", () => {
    expect(normalizePersistedWindowDecoration("minimal")).toBe("macos-subtle");
  });

  it("keeps the new Minimal style after the schema upgrade", () => {
    expect(normalizePersistedWindowDecoration("minimal", 2)).toBe("minimal");
  });

  it("falls back safely for unknown persisted values", () => {
    expect(normalizePersistedWindowDecoration("unknown", 2)).toBe("macos");
  });
});

describe("shouldShowPreviewGutter", () => {
  it("hides the gutter only when every gutter feature is disabled", () => {
    expect(shouldShowPreviewGutter(false, false, false)).toBe(false);
  });

  it("shows the gutter independently for line numbers or annotation actions", () => {
    expect(shouldShowPreviewGutter(true, false, false)).toBe(true);
    expect(shouldShowPreviewGutter(false, true, false)).toBe(true);
    expect(shouldShowPreviewGutter(false, false, true)).toBe(true);
  });
});

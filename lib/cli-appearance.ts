import { availableThemes } from "@lumis-sh/lumis/client";
import {
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE,
  EXPORT_INNER_PADDING,
  EXPORT_CORNER_RADIUS_VALUES,
  EXPORT_INNER_PADDING_VALUES,
  EXPORT_OUTER_PADDING_VALUES,
  EXPORT_FONT_SIZE_VALUES,
  type ExportBackground,
  type WindowDecoration,
} from "@/lib/export-utils";
import { BRAND_PRESETS, getBrandPreset } from "@/lib/brand-presets";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  normalizeFooterSettings,
  normalizeHeaderSettings,
  type ExportFooterSettings,
  type ExportHeaderSettings,
} from "@/lib/export-metadata";

/**
 * The composition the CLI asks the server to render. This mirrors the
 * homepage composer's `Draft` minus the code/filename fields, so a CLI publish
 * and a browser publish produce byte-comparable assets for the same settings.
 */
export type CliAppearance = {
  theme: string;
  background: string | null;
  fontId: string;
  fontSize: number;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  pixelRatio: number;
  lineNumbers: boolean;
  windowDecoration: WindowDecoration;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
};

export const CLI_PIXEL_RATIO_VALUES = [2, 4, 6] as const;
export const CLI_WINDOW_DECORATIONS: readonly WindowDecoration[] = [
  "macos",
  "macos-subtle",
  "windows",
  "minimal",
  "none",
];

export const DEFAULT_CLI_APPEARANCE: CliAppearance = {
  theme: "github_light",
  background: null,
  fontId: "system",
  fontSize: EXPORT_FONT_SIZE,
  outerPadding: 64,
  innerPadding: EXPORT_INNER_PADDING,
  cornerRadius: 12,
  pixelRatio: 4,
  lineNumbers: false,
  windowDecoration: "macos",
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
};

let cachedThemeIds: Set<string> | null = null;

/** Theme ids the CLI may request, from Lumis's own catalog. */
export function availableThemeIds(): Set<string> {
  if (!cachedThemeIds) {
    cachedThemeIds = new Set(availableThemes().map((theme) => theme.name));
  }
  return cachedThemeIds;
}

const ALL_BACKGROUNDS: ExportBackground[] = [...EXPORT_BACKGROUNDS, ...EXPORT_BRAND_BACKGROUNDS];

/** Resolves a background label (case-insensitive) to its export definition. */
export function findBackground(label: string): ExportBackground | null {
  const needle = label.trim().toLowerCase();
  return ALL_BACKGROUNDS.find((bg) => bg.label.toLowerCase() === needle) ?? null;
}

export function backgroundLabels(): string[] {
  return ALL_BACKGROUNDS.map((bg) => bg.label);
}

export function brandIds(): string[] {
  return BRAND_PRESETS.map((preset) => preset.id);
}

export function fontIds(): string[] {
  return EXPORT_FONTS.map((font) => font.id);
}

export class CliAppearanceError extends Error {}

function fail(message: string): never {
  throw new CliAppearanceError(message);
}

function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") fail(`\`${key}\` must be a string.`);
  return value;
}

function readBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail(`\`${key}\` must be a boolean.`);
  return value;
}

function readEnumNumber(
  input: Record<string, unknown>,
  key: string,
  allowed: readonly number[],
): number | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !allowed.includes(value)) {
    fail(`\`${key}\` must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

/**
 * Builds a fully-resolved appearance from an untrusted CLI payload.
 *
 * Precedence is defaults → brand preset → explicit fields, matching the
 * composer: applying a Brand writes a complete composition, and any individual
 * option the user also passed then overrides that one value.
 *
 * Throws `CliAppearanceError` with a message meant for the user's terminal.
 */
export function parseCliAppearance(raw: unknown): CliAppearance {
  if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) {
    fail("`appearance` must be an object.");
  }
  const input = (raw ?? {}) as Record<string, unknown>;

  let appearance: CliAppearance = { ...DEFAULT_CLI_APPEARANCE };

  const brandId = readString(input, "brand");
  if (brandId !== undefined) {
    const preset = getBrandPreset(brandId);
    if (!preset) fail(`Unknown brand "${brandId}". Available: ${brandIds().join(", ")}.`);
    appearance = {
      ...appearance,
      ...preset.settings,
      background: preset.background.label,
    };
  }

  const theme = readString(input, "theme");
  if (theme !== undefined) {
    if (!availableThemeIds().has(theme)) fail(`Unknown theme "${theme}".`);
    appearance.theme = theme;
  }

  // `background: null` is meaningful — it means "no canvas behind the card" —
  // so an explicit null must survive rather than being treated as absent.
  if ("background" in input) {
    const value = input.background;
    if (value === null) {
      appearance.background = null;
    } else if (typeof value === "string") {
      const background = findBackground(value);
      if (!background) {
        fail(`Unknown background "${value}". Available: ${backgroundLabels().join(", ")}.`);
      }
      appearance.background = background.label;
    } else {
      fail("`background` must be a string or null.");
    }
  }

  const font = readString(input, "font");
  if (font !== undefined) {
    if (!fontIds().includes(font))
      fail(`Unknown font "${font}". Available: ${fontIds().join(", ")}.`);
    appearance.fontId = font;
  }

  const windowDecoration = readString(input, "window");
  if (windowDecoration !== undefined) {
    if (!CLI_WINDOW_DECORATIONS.includes(windowDecoration as WindowDecoration)) {
      fail(
        `Unknown window style "${windowDecoration}". Available: ${CLI_WINDOW_DECORATIONS.join(", ")}.`,
      );
    }
    appearance.windowDecoration = windowDecoration as WindowDecoration;
  }

  const fontSize = readEnumNumber(input, "fontSize", EXPORT_FONT_SIZE_VALUES);
  if (fontSize !== undefined) appearance.fontSize = fontSize;

  const outerPadding = readEnumNumber(input, "outerPadding", EXPORT_OUTER_PADDING_VALUES);
  if (outerPadding !== undefined) appearance.outerPadding = outerPadding;

  const innerPadding = readEnumNumber(input, "innerPadding", EXPORT_INNER_PADDING_VALUES);
  if (innerPadding !== undefined) appearance.innerPadding = innerPadding;

  const cornerRadius = readEnumNumber(input, "cornerRadius", EXPORT_CORNER_RADIUS_VALUES);
  if (cornerRadius !== undefined) appearance.cornerRadius = cornerRadius;

  const pixelRatio = readEnumNumber(input, "pixelRatio", CLI_PIXEL_RATIO_VALUES);
  if (pixelRatio !== undefined) appearance.pixelRatio = pixelRatio;

  const lineNumbers = readBoolean(input, "lineNumbers");
  if (lineNumbers !== undefined) appearance.lineNumbers = lineNumbers;

  if ("header" in input && input.header !== undefined && input.header !== null) {
    if (typeof input.header !== "object" || Array.isArray(input.header)) {
      fail("`header` must be an object.");
    }
    appearance.header = normalizeHeaderSettings({
      ...appearance.header,
      ...(input.header as Record<string, unknown>),
    });
  }

  if ("footer" in input && input.footer !== undefined && input.footer !== null) {
    if (typeof input.footer !== "object" || Array.isArray(input.footer)) {
      fail("`footer` must be an object.");
    }
    appearance.footer = normalizeFooterSettings({
      ...appearance.footer,
      ...(input.footer as Record<string, unknown>),
    });
  }

  return appearance;
}

/** The `ExportBackground` the resolved appearance points at, if any. */
export function resolveAppearanceBackground(appearance: CliAppearance): ExportBackground | null {
  return appearance.background ? findBackground(appearance.background) : null;
}

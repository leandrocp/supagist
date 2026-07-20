export type MetadataAlignment = "left" | "center" | "right";

export type ExportHeaderSettings = {
  enabled: boolean;
  showFilename: boolean;
  showLanguage: boolean;
  filenamePosition: MetadataAlignment;
  languagePosition: MetadataAlignment;
};

export type ExportFooterSettings = {
  enabled: boolean;
  showLanguage: boolean;
  showTheme: boolean;
  showLineCount: boolean;
  showCharCount: boolean;
  showAuthor: boolean;
  alignment: MetadataAlignment;
};

export type FooterItem = "language" | "theme" | "lineCount" | "charCount" | "author";

export const DEFAULT_HEADER_SETTINGS: ExportHeaderSettings = {
  enabled: true,
  showFilename: true,
  showLanguage: true,
  filenamePosition: "center",
  languagePosition: "right",
};

export const DEFAULT_FOOTER_SETTINGS: ExportFooterSettings = {
  enabled: false,
  showLanguage: true,
  showTheme: true,
  showLineCount: true,
  showCharCount: true,
  showAuthor: true,
  alignment: "left",
};

const ALIGNMENTS = new Set<MetadataAlignment>(["left", "center", "right"]);

export function normalizeHeaderSettings(
  value: unknown,
  legacyShowFilename = true,
): ExportHeaderSettings {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<ExportHeaderSettings> & { alignment?: unknown })
      : {};
  const legacyPosition =
    typeof candidate.alignment === "string" &&
    ALIGNMENTS.has(candidate.alignment as MetadataAlignment)
      ? (candidate.alignment as MetadataAlignment)
      : null;

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    showFilename:
      typeof candidate.showFilename === "boolean" ? candidate.showFilename : legacyShowFilename,
    showLanguage:
      typeof candidate.showLanguage === "boolean"
        ? candidate.showLanguage
        : DEFAULT_HEADER_SETTINGS.showLanguage,
    filenamePosition:
      typeof candidate.filenamePosition === "string" &&
      ALIGNMENTS.has(candidate.filenamePosition as MetadataAlignment)
        ? (candidate.filenamePosition as MetadataAlignment)
        : (legacyPosition ?? DEFAULT_HEADER_SETTINGS.filenamePosition),
    languagePosition:
      typeof candidate.languagePosition === "string" &&
      ALIGNMENTS.has(candidate.languagePosition as MetadataAlignment)
        ? (candidate.languagePosition as MetadataAlignment)
        : (legacyPosition ?? DEFAULT_HEADER_SETTINGS.languagePosition),
  };
}

export function normalizeFooterSettings(
  value: unknown,
  legacyShowFooter = false,
): ExportFooterSettings {
  const candidate =
    value && typeof value === "object" ? (value as Partial<ExportFooterSettings>) : {};

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : legacyShowFooter,
    showLanguage:
      typeof candidate.showLanguage === "boolean"
        ? candidate.showLanguage
        : DEFAULT_FOOTER_SETTINGS.showLanguage,
    showTheme:
      typeof candidate.showTheme === "boolean"
        ? candidate.showTheme
        : DEFAULT_FOOTER_SETTINGS.showTheme,
    showLineCount:
      typeof candidate.showLineCount === "boolean"
        ? candidate.showLineCount
        : DEFAULT_FOOTER_SETTINGS.showLineCount,
    showCharCount:
      typeof candidate.showCharCount === "boolean"
        ? candidate.showCharCount
        : DEFAULT_FOOTER_SETTINGS.showCharCount,
    showAuthor:
      typeof candidate.showAuthor === "boolean"
        ? candidate.showAuthor
        : DEFAULT_FOOTER_SETTINGS.showAuthor,
    alignment:
      typeof candidate.alignment === "string" &&
      ALIGNMENTS.has(candidate.alignment as MetadataAlignment)
        ? (candidate.alignment as MetadataAlignment)
        : DEFAULT_FOOTER_SETTINGS.alignment,
  };
}

export function visibleFooterItems(settings: ExportFooterSettings): FooterItem[] {
  if (!settings.enabled) return [];

  return [
    settings.showLanguage ? "language" : null,
    settings.showTheme ? "theme" : null,
    settings.showLineCount ? "lineCount" : null,
    settings.showCharCount ? "charCount" : null,
    settings.showAuthor ? "author" : null,
  ].filter((item): item is FooterItem => item !== null);
}

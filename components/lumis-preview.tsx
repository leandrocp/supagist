"use client";

import { useEffect, useMemo, useState } from "react";
import { availableLanguages, createHighlighter, withWasmBundle } from "@lumis-sh/lumis/client";
import { bundledLanguages } from "@lumis-sh/lumis/bundles/full";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import { CodeBlock } from "@lumis-sh/react";
import bundledWasms from "@lumis-sh/wasm-bundle-full";
import type { ThemeData } from "@lumis-sh/themes";

const highlighter = createHighlighter({
  languages: [withWasmBundle(bundledLanguages, bundledWasms)],
});

type ThemeModule = {
  default: ThemeData;
};

type LumisPreviewProps = {
  filename: string;
  code: string;
  theme: string;
};

export function LumisPreview({ filename, code, theme }: LumisPreviewProps) {
  const [themeModule, setThemeModule] = useState<ThemeModule["default"] | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTheme() {
      try {
        setThemeError(null);
        const loadedTheme = (await import(`@lumis-sh/themes/${theme}`)) as ThemeModule;

        if (isActive) {
          setThemeModule(loadedTheme.default);
        }
      } catch {
        if (isActive) {
          setThemeModule(null);
          setThemeError(`Could not load the ${theme} theme.`);
        }
      }
    }

    void loadTheme();

    return () => {
      isActive = false;
    };
  }, [theme]);

  const language = useMemo(() => inferLanguage(filename, code), [filename, code]);

  return (
    <div className="overflow-x-auto rounded-3xl border border-black/10 bg-[#171717] p-6 shadow-2xl shadow-black/20 dark:border-white/10">
      <div className="mb-5 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-white/50">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span>{language}</span>
          <span>{theme}</span>
        </div>
      </div>

      {themeError ? (
        <p className="text-sm text-destructive">{themeError}</p>
      ) : themeModule ? (
        <CodeBlock
          highlighter={highlighter}
          formatter={htmlInline({ language, theme: themeModule })}
        >
          {code}
        </CodeBlock>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Loading preview...
        </div>
      )}
    </div>
  );
}

function inferLanguage(filename: string, code: string) {
  const normalizedFilename = filename.trim().toLowerCase();
  const languages = availableLanguages();

  const byFilename = languages.find((language) =>
    language.extensions.some((extension) => {
      const suffix = extension.replace(/^\*/, "").toLowerCase();
      return suffix ? normalizedFilename.endsWith(suffix) : false;
    }),
  );

  if (byFilename) {
    return byFilename.id;
  }

  if (code.startsWith("#!")) {
    if (code.includes("python")) return "python";
    if (code.includes("node") || code.includes("bun")) return "javascript";
    if (code.includes("bash") || code.includes("sh")) return "bash";
  }

  if (code.trimStart().startsWith("<!DOCTYPE html") || code.includes("<html")) {
    return "html";
  }

  if (code.trimStart().startsWith("<?xml")) {
    return "xml";
  }

  if (code.includes("interface ") || code.includes("type ")) {
    return "typescript";
  }

  if (code.includes("SELECT ") || code.includes("select ")) {
    return "sql";
  }

  return "text";
}

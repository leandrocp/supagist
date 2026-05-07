import { createHighlighter } from "@lumis-sh/lumis";
import { bundledLanguages } from "@lumis-sh/lumis/bundles/full";
import { spanInline } from "@lumis-sh/lumis/formatters/html";
import type { ThemeData } from "@lumis-sh/themes";

type ThemeModule = { default: ThemeData };

const highlighterPromise = createHighlighter({ languages: [bundledLanguages] });

type Props = {
  code: string;
  language: string;
  theme: string;
  filename: string;
};

export async function SnippetCodeBlock({ code, language, theme: themeName, filename }: Props) {
  let highlightedLines: string[];

  try {
    const [highlighter, themeModule] = await Promise.all([
      highlighterPromise,
      import(`@lumis-sh/themes/${themeName}`) as Promise<ThemeModule>,
    ]);

    await highlighter.loadLanguage(language);
    highlightedLines = renderLines(code, language, themeModule.default, highlighter);
  } catch {
    // fallback: plain escaped text
    highlightedLines = code.split("\n").map(escapeHtml);
  }

  const lines = code.split("\n");

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#171717] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/45">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-3">
          <span>{filename}</span>
          <span>{themeName}</span>
        </div>
      </div>

      <div className="grid grid-cols-[52px_minmax(0,1fr)]">
        {/* line numbers */}
        <div className="border-r border-white/5 bg-black/15 py-4 text-right font-mono text-sm leading-7 text-white/30">
          {lines.map((_, index) => (
            <div key={index} className="h-7 px-3">
              {index + 1}
            </div>
          ))}
        </div>

        {/* highlighted code */}
        <div className="overflow-x-auto bg-[#171717] py-4 pl-4 pr-6 font-mono text-sm leading-7">
          {highlightedLines.map((line, index) => (
            <div
              key={index}
              className="h-7 whitespace-pre"
              dangerouslySetInnerHTML={{ __html: line || " " }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderLines(
  code: string,
  language: string,
  theme: ThemeData,
  highlighter: Awaited<typeof highlighterPromise>,
): string[] {
  const lines = code.split("\n").map(() => "");
  let lineIndex = 0;

  highlighter.highlightIter(code, language, theme, (text, tokenLanguage, _range, scope) => {
    const chunks = text.split("\n");
    chunks.forEach((chunk, chunkIndex) => {
      if (chunk) {
        lines[lineIndex] += scope
          ? spanInline(chunk, { language: tokenLanguage, scope, theme })
          : escapeHtml(chunk);
      }
      if (chunkIndex < chunks.length - 1) lineIndex += 1;
    });
  });

  return lines;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

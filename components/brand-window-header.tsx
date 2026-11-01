import type { BrandFramePreset } from "@/lib/brand-presets";
import type { ExportHeaderSettings } from "@/lib/export-metadata";
import {
  LUMIS_HEADER,
  LUMIS_HEADER_DASHES,
  MARKDOWN_HEADER,
  brandHeaderRuns,
  brandHeaderScale,
  exportHeaderHeight,
  readableOnFill,
  type BrandHeaderRun,
} from "@/lib/export-utils";

type BrandWindowHeaderProps = {
  decoration: "lumis" | "markdown";
  brandFrame?: BrandFramePreset;
  header: ExportHeaderSettings;
  filename: string;
  language: string;
  cardFill: string;
  /** Rule under the bar when the brand frame names none. */
  borderColor: string;
  fontSize: number;
  /** Extra controls at the right end of the bar, such as the saved view's actions. */
  actions?: React.ReactNode;
};

/**
 * The `lumis` / `markdown` window bars, mirroring the export's
 * renderBrandHeader. Shared by the home composer and the saved snippet view.
 */
export function BrandWindowHeader({
  decoration,
  brandFrame,
  header,
  filename,
  language,
  cardFill,
  borderColor,
  fontSize,
  actions,
}: BrandWindowHeaderProps) {
  const s = brandHeaderScale(fontSize);
  const runs = brandHeaderRuns(
    decoration,
    brandFrame,
    header,
    filename,
    language,
    readableOnFill(cardFill),
  );
  const runStyle = (run: BrandHeaderRun, size: number): React.CSSProperties => ({
    color: run.color,
    opacity: run.opacity,
    fontWeight: run.weight,
    fontSize: size * s,
  });
  const style: React.CSSProperties = {
    height: exportHeaderHeight(decoration, fontSize, brandFrame),
    backgroundColor: brandFrame?.headerFill ?? cardFill,
    borderColor: brandFrame?.headerBorder ?? brandFrame?.cardBorder?.color ?? borderColor,
    fontVariantLigatures: "none",
  };
  if (decoration === "lumis") {
    const { padX, markGap, filenameSize, labelSize, labelGap, dash } = LUMIS_HEADER;
    const mark = brandFrame?.headerMark;
    return (
      <div
        data-testid="lumis-window-header"
        className="flex items-center justify-between gap-4 border-b whitespace-pre"
        style={{ ...style, paddingInline: padX * s }}
      >
        <div className="flex min-w-0 items-center" style={{ gap: markGap * s }}>
          {mark ? (
            <span
              aria-hidden
              data-testid="lumis-window-mark"
              className="shrink-0 bg-contain bg-center bg-no-repeat"
              style={{
                width: mark.size * s,
                height: mark.size * s,
                backgroundImage: `url(${mark.src})`,
              }}
            />
          ) : null}
          {runs.filename ? (
            <span className="truncate" style={runStyle(runs.filename, filenameSize)}>
              {runs.filename.text}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center" style={{ gap: labelGap * s }}>
          {runs.language ? (
            <span style={runStyle(runs.language, labelSize)}>{runs.language.text}</span>
          ) : null}
          <span aria-hidden className="flex" style={{ gap: dash.gap * s }}>
            {LUMIS_HEADER_DASHES.map((color) => (
              <span
                key={color}
                data-testid="lumis-window-dash"
                style={{
                  width: dash.width * s,
                  height: dash.height * s,
                  borderRadius: (dash.height / 2) * s,
                  backgroundColor: color,
                }}
              />
            ))}
          </span>
          {actions}
        </div>
      </div>
    );
  }
  const { padX, fontSize: size, gap, controls } = MARKDOWN_HEADER;
  const muted = runs.language ?? {
    text: "",
    color: brandFrame?.languageLabel?.color ?? readableOnFill(cardFill),
    opacity: brandFrame?.languageLabel ? (brandFrame.languageLabel.opacity ?? 1) : 0.6,
    weight: 400,
  };
  return (
    <div
      data-testid="markdown-window-header"
      className="flex items-center justify-between gap-4 border-b whitespace-pre"
      style={{ ...style, paddingInline: padX * s }}
    >
      <div className="flex min-w-0 items-center" style={{ gap: gap * s }}>
        {runs.filename ? (
          <span className="truncate" style={runStyle(runs.filename, size)}>
            {runs.filename.text}
          </span>
        ) : null}
        {runs.language ? (
          <span className="shrink-0" style={runStyle(runs.language, size)}>
            {runs.language.text}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span aria-hidden style={runStyle({ ...muted, weight: 400 }, size)}>
          {controls}
        </span>
        {actions}
      </div>
    </div>
  );
}

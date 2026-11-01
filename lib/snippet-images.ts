import {
  EXPORT_WIDTH,
  createHighlightedSvg,
  renderToFile,
  toPngFilename,
  type ExportBackground,
} from "@/lib/export-utils";
import type { SnippetAppearance } from "@/lib/snippet-appearance";
import type { ExportReactionChip } from "@/lib/snippet-utils";

/**
 * The files a published snippet stores, rendered in the browser from what the
 * author composed: the composer's publish and the owner's edit both use them,
 * so an edited snippet gets the same images a fresh publish would.
 */
export type SnippetImageDraft = SnippetAppearance & {
  filename: string;
  code: string;
  theme: string;
  fontId: string;
  languageOverride: string | null;
};

export type DraftReactions = Record<number, ExportReactionChip[]>;

/** Save as PNG, and the published canonical.png. */
export async function createDraftPng(
  draft: SnippetImageDraft,
  background: ExportBackground | null,
  reactions: DraftReactions | null,
  authorUsername: string | null,
  authorAvatarUrl: string | null,
): Promise<File> {
  return renderToFile(
    draft.code,
    draft.filename,
    draft.theme,
    EXPORT_WIDTH,
    undefined,
    toPngFilename(draft.filename),
    draft.pixelRatio,
    background,
    background ? draft.outerPadding : 0,
    draft.lineNumbers,
    draft.fontId,
    draft.languageOverride,
    reactions,
    draft.showReactions,
    draft.header.enabled && draft.header.showFilename,
    draft.footer.enabled,
    authorUsername,
    authorAvatarUrl,
    undefined,
    false,
    undefined,
    draft.windowDecoration,
    draft.cornerRadius,
    draft.innerPadding,
    draft.header,
    draft.footer,
    draft.fontSize,
    draft.aspectRatio,
    draft.ligatures,
  );
}

/** Save as SVG, and the published canonical.svg. */
export async function createDraftSvg(
  draft: SnippetImageDraft,
  background: ExportBackground | null,
  reactions: DraftReactions,
  authorUsername: string | null,
  authorAvatarUrl: string | null,
): Promise<string> {
  return createHighlightedSvg(
    draft.code,
    draft.filename,
    draft.theme,
    EXPORT_WIDTH,
    undefined,
    background,
    background ? draft.outerPadding : 0,
    draft.lineNumbers,
    draft.fontId,
    draft.languageOverride,
    reactions,
    draft.showReactions,
    draft.header.enabled && draft.header.showFilename,
    draft.footer.enabled,
    authorUsername,
    authorAvatarUrl,
    undefined,
    false,
    undefined,
    draft.windowDecoration,
    draft.cornerRadius,
    draft.innerPadding,
    draft.header,
    draft.footer,
    draft.fontSize,
    false,
    draft.aspectRatio,
    draft.ligatures,
  );
}

/**
 * The card alone (no background, no reactions) at 2×, for the per-snippet
 * share image: the server lays it into the envelope instead of re-running
 * Lumis. Same frame, header and footer as the author's export.
 */
async function createCardImage(
  draft: SnippetImageDraft,
  authorUsername: string,
  authorAvatarUrl: string | null,
): Promise<File> {
  return createDraftPng(
    { ...draft, pixelRatio: 2, showReactions: false, aspectRatio: null },
    null,
    null,
    authorUsername,
    authorAvatarUrl,
  );
}

async function createOgImage(
  draft: SnippetImageDraft,
  authorUsername: string,
  authorAvatarUrl: string | null,
): Promise<File> {
  // OG images must be exactly 1200×630 — no retina scaling or platforms reject them.
  // Metadata selections mirror the canonical export so shared previews stay
  // faithful to the composition the author configured.
  return renderToFile(
    draft.code,
    draft.filename,
    draft.theme,
    1200,
    630,
    toPngFilename(draft.filename, "-og"),
    1,
    null, // no background
    undefined, // outer padding default
    true, // lineNumbers
    draft.fontId,
    draft.languageOverride,
    null, // no reactions in OG
    false, // showReactions
    draft.header.enabled && draft.header.showFilename,
    draft.footer.enabled,
    authorUsername,
    authorAvatarUrl,
    undefined,
    false,
    undefined,
    draft.windowDecoration,
    draft.cornerRadius,
    draft.innerPadding,
    draft.header,
    draft.footer,
    draft.fontSize,
  );
}

/** Everything a publish uploads: canonical PNG and SVG, the OG image and the card. */
export async function createSnippetImages(
  draft: SnippetImageDraft,
  background: ExportBackground | null,
  reactions: DraftReactions,
  authorUsername: string,
  authorAvatarUrl: string | null,
): Promise<{ canonical: File; og: File; svg: Blob; card: File }> {
  const [canonical, og, svg, card] = await Promise.all([
    createDraftPng(draft, background, reactions, authorUsername, authorAvatarUrl),
    createOgImage(draft, authorUsername, authorAvatarUrl),
    createDraftSvg(draft, background, reactions, authorUsername, authorAvatarUrl),
    createCardImage(draft, authorUsername, authorAvatarUrl),
  ]);
  return {
    canonical,
    og,
    svg: new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    card,
  };
}

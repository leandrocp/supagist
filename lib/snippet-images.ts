import {
  createHighlightedSvg,
  renderToFile,
  toPngFilename,
  type ExportBackground,
  type ExportOptions,
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

/** The draft's export, as Save as PNG / SVG and a publish draw it. */
function draftExport(
  draft: SnippetImageDraft,
  background: ExportBackground | null,
  reactions: DraftReactions | null,
  authorUsername: string | null,
  authorAvatarUrl: string | null,
): ExportOptions {
  return {
    code: draft.code,
    filename: draft.filename,
    theme: draft.theme,
    background,
    outerPadding: draft.outerPadding,
    lineNumbers: draft.lineNumbers,
    fontId: draft.fontId,
    language: draft.languageOverride,
    reactions,
    showReactions: draft.showReactions,
    footerAuthorUsername: authorUsername,
    footerAuthorAvatarUrl: authorAvatarUrl,
    windowDecoration: draft.windowDecoration,
    cornerRadius: draft.cornerRadius,
    innerPadding: draft.innerPadding,
    header: draft.header,
    footer: draft.footer,
    fontSize: draft.fontSize,
    aspectRatio: draft.aspectRatio,
    ligatures: draft.ligatures,
  };
}

/** Save as PNG, and the published canonical.png. */
export async function createDraftPng(
  draft: SnippetImageDraft,
  background: ExportBackground | null,
  reactions: DraftReactions | null,
  authorUsername: string | null,
  authorAvatarUrl: string | null,
): Promise<File> {
  return renderToFile({
    ...draftExport(draft, background, reactions, authorUsername, authorAvatarUrl),
    outFilename: toPngFilename(draft.filename),
    pixelRatio: draft.pixelRatio,
  });
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
    draftExport(draft, background, reactions, authorUsername, authorAvatarUrl),
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
  return renderToFile({
    ...draftExport(draft, null, null, authorUsername, authorAvatarUrl),
    showReactions: false,
    lineNumbers: true,
    width: 1200,
    height: 630,
    aspectRatio: null,
    ligatures: true,
    outFilename: toPngFilename(draft.filename, "-og"),
    pixelRatio: 1,
  });
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

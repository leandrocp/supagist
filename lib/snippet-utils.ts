import { availableLanguages } from "@lumis-sh/lumis";

/** Returns the decoded slug + shortId from a URL segment like "my-file-abc123". */
export function parseSnippetParam(param: string): { slug: string; shortId: string } | null {
  if (param.length < 8) return null;
  const maybeShortId = param.slice(-6);
  const separator = param[param.length - 7];
  if (separator !== "-" || !/^[a-z0-9]{6}$/.test(maybeShortId)) return null;
  const slug = param.slice(0, -7);
  if (!slug) return null;
  return { slug, shortId: maybeShortId };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Builds the social-card description shown by Slack, X, and other link-preview
 * unfurlers. Three short lines: filename + author, then a single-line stat row
 * (lang, theme, lines, chars), then the project tagline. We deliberately don't
 * dump source from the snippet — early versions did, but the excerpt rendered
 * messily because previewers strip newlines unpredictably and the first source
 * line is often a heading that just duplicates the filename.
 */
export function buildSnippetSocialAlt(args: {
  filename: string;
  authorUsername?: string | null;
  language: string | null;
  theme: string;
  lineCount: number;
  charCount: number;
}): string {
  const langName = args.language ? languageDisplayName(args.language) : "Text";
  const handle = args.authorUsername ? `@${args.authorUsername}` : "anonymous";
  const meta = [
    langName,
    args.theme,
    `${args.lineCount} lines`,
    `${args.charCount.toLocaleString()} / 8,000`,
  ].join(" | ");
  return [`${args.filename} by ${handle}`, meta, `# Supagist. Comment, react, share.`].join(
    "\n",
  );
}

/**
 * Counts characters the way Postgres `char_length()` does — by Unicode code
 * point, not UTF-16 code unit. Required so any field we compute in JS (e.g.
 * `snippets.code_char_count`, the footer counter) matches what the database
 * sees: an astral-plane character like 🔥 is `'🔥'.length === 2` in JS but
 * `char_length('🔥') === 1` in Postgres.
 */
export function codePointLength(value: string): number {
  let count = 0;
  for (const _ of value) count += 1;
  return count;
}

/** Friendly display name for a Lumis language id (e.g. "elixir" → "Elixir"). */
export function languageDisplayName(id: string): string {
  if (!id) return "Text";
  const match = availableLanguages().find((l) => l.id === id);
  return match?.name ?? id;
}

export function inferLanguage(filename: string, code: string): string {
  const norm = filename.trim().toLowerCase();
  const languages = availableLanguages();

  const byExt = languages.find((language) =>
    language.extensions.some((ext) => {
      const suffix = ext.replace(/^\*/, "").toLowerCase();
      return suffix ? norm.endsWith(suffix) : false;
    }),
  );
  if (byExt) return byExt.id;

  if (code.startsWith("#!")) {
    if (code.includes("python")) return "python";
    if (code.includes("node") || code.includes("bun")) return "javascript";
    if (code.includes("bash") || code.includes("sh")) return "bash";
  }
  if (code.trimStart().startsWith("<!DOCTYPE html") || code.includes("<html")) return "html";
  if (code.trimStart().startsWith("<?xml")) return "xml";
  if (code.includes("interface ") || code.includes("type ")) return "typescript";
  if (code.includes("SELECT ") || code.includes("select ")) return "sql";

  return "text";
}

export function generateShortId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % 36]).join("");
}

export function toSlug(filename: string): string {
  return (
    filename
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "snippet"
  );
}

export function getRawFileExtension(filename: string): string {
  const trimmed = filename.trim();
  const basename = trimmed.split(/[\\/]/).pop() ?? "";
  const dotIndex = basename.lastIndexOf(".");
  const extension = dotIndex >= 0 ? basename.slice(dotIndex + 1).toLowerCase() : "";

  return /^[a-z0-9]+$/.test(extension) ? extension : "txt";
}

function isPositiveLineNumber(value: string): boolean {
  const lineNumber = Number(value);
  return Number.isInteger(lineNumber) && lineNumber > 0;
}

/** Build DB row objects for snippet_line_reactions from a draft reactions map. */
export function buildReactionRows(
  snippetId: string,
  authorId: string,
  reactions: Record<number, string>,
) {
  return Object.entries(reactions)
    .filter(([lineNumber, emoji]) => isPositiveLineNumber(lineNumber) && Boolean(emoji))
    .map(([lineNumber, emoji]) => ({
      snippet_id: snippetId,
      author_id: authorId,
      line_number: Number(lineNumber),
      emoji,
    }));
}

/** Build DB row objects for snippet_comments from a draft comments map. */
export function buildCommentRows(
  snippetId: string,
  authorId: string,
  comments: Record<number, { body: string }>,
) {
  return Object.entries(comments)
    .filter(([lineNumber, comment]) => isPositiveLineNumber(lineNumber) && comment?.body?.trim())
    .map(([lineNumber, c]) => ({
      snippet_id: snippetId,
      author_id: authorId,
      line_number: Number(lineNumber),
      body: c.body.trim(),
    }));
}

/**
 * Group per-line reactions by emoji for the inline chip row, returning a stable
 * order: most popular emojis first, then alphabetical, ties broken by emoji.
 * `mine` is true when the current user is among the authors of that emoji.
 * `reactors` is the list of authors (insertion order from the input) so the UI
 * can render avatar stacks and tooltips without re-grouping.
 */
export type ReactionGroup = {
  emoji: string;
  count: number;
  mine: boolean;
  reactors: Array<{
    authorId: string;
    authorUsername: string;
    authorAvatarUrl: string | null;
  }>;
};

export function groupLineReactions<
  R extends {
    emoji: string;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl: string | null;
  },
>(reactions: R[], currentUserId: string | null): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const reactor = {
      authorId: r.authorId,
      authorUsername: r.authorUsername,
      authorAvatarUrl: r.authorAvatarUrl,
    };
    const existing = groups.get(r.emoji);
    if (existing) {
      existing.count += 1;
      existing.reactors.push(reactor);
      if (r.authorId === currentUserId) existing.mine = true;
    } else {
      groups.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        mine: r.authorId === currentUserId,
        reactors: [reactor],
      });
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji),
  );
}

/**
 * Group reaction rows by line into deduped emoji lists, preserving insertion
 * order so the export shows them the way the editor does. Used by the export
 * pipeline so a line with `🔥 + 🤔` exports both, not just the first.
 */
export function uniqueEmojisPerLine(
  rows: Array<{ line_number: number; emoji: string }>,
): Record<number, string[]> {
  const order: Record<number, string[]> = {};
  const seen: Record<number, Set<string>> = {};
  for (const row of rows) {
    if (!seen[row.line_number]) {
      seen[row.line_number] = new Set();
      order[row.line_number] = [];
    }
    if (!seen[row.line_number].has(row.emoji)) {
      seen[row.line_number].add(row.emoji);
      order[row.line_number].push(row.emoji);
    }
  }
  return order;
}

export type ExportReactionChip = {
  emoji: string;
  reactors: Array<{ username: string; avatarUrl?: string | null }>;
};

/**
 * Group reaction rows for the export. Each line gets a list of chips — one
 * per unique emoji — carrying the list of reactors so the SVG export can
 * render the reactor's GitHub avatar (or fall back to an initial circle
 * when the URL is missing or fails to load).
 */
export function groupExportReactions(
  rows: Array<{
    line_number: number;
    emoji: string;
    username: string;
    avatarUrl?: string | null;
  }>,
): Record<number, ExportReactionChip[]> {
  const result: Record<number, ExportReactionChip[]> = {};
  const indexByEmoji: Record<number, Map<string, number>> = {};
  for (const row of rows) {
    if (!result[row.line_number]) {
      result[row.line_number] = [];
      indexByEmoji[row.line_number] = new Map();
    }
    const idx = indexByEmoji[row.line_number].get(row.emoji);
    const reactor = { username: row.username, avatarUrl: row.avatarUrl ?? null };
    if (idx === undefined) {
      indexByEmoji[row.line_number].set(row.emoji, result[row.line_number].length);
      result[row.line_number].push({ emoji: row.emoji, reactors: [reactor] });
    } else {
      result[row.line_number][idx].reactors.push(reactor);
    }
  }
  return result;
}

/**
 * Build the export-chip shape from the client-side `lineReactions` state used
 * by the saved view. The state already groups by line, but per chip we need
 * to dedupe by emoji and collect each reactor's username + avatar — same
 * shape as `groupExportReactions`, just from the client store rather than
 * from raw DB rows. Lets the export modal show reactions added in the
 * current session without a page refresh.
 */
export function lineReactionsToExportChips(
  byLine: Record<
    number,
    Array<{ emoji: string; authorUsername: string; authorAvatarUrl: string | null }>
  >,
): Record<number, ExportReactionChip[]> {
  const result: Record<number, ExportReactionChip[]> = {};
  for (const [ln, rxns] of Object.entries(byLine)) {
    const byEmoji = new Map<string, Array<{ username: string; avatarUrl: string | null }>>();
    for (const r of rxns) {
      const list = byEmoji.get(r.emoji) ?? [];
      list.push({ username: r.authorUsername, avatarUrl: r.authorAvatarUrl });
      byEmoji.set(r.emoji, list);
    }
    result[Number(ln)] = Array.from(byEmoji, ([emoji, reactors]) => ({ emoji, reactors }));
  }
  return result;
}

/** Reduce reaction rows to one emoji per line (first one wins — for export). */
export function firstReactionPerLine(
  rows: Array<{ line_number: number; emoji: string }>,
): Record<number, string> {
  const result: Record<number, string> = {};
  for (const row of rows) {
    if (!result[row.line_number]) result[row.line_number] = row.emoji;
  }
  return result;
}

import { describe, it, expect } from "vitest";
import {
  parseSnippetParam,
  escapeHtml,
  generateShortId,
  toSlug,
  inferLanguage,
  languageDisplayName,
  groupLineReactions,
  uniqueEmojisPerLine,
  groupExportReactions,
  getRawFileExtension,
  buildReactionRows,
  buildCommentRows,
  firstReactionPerLine,
  codePointLength,
  lineReactionsToExportChips,
  buildSnippetSocialAlt,
} from "./snippet-utils";

// ── parseSnippetParam ────────────────────────────────────────────────────────

describe("parseSnippetParam", () => {
  it("parses a valid param", () => {
    expect(parseSnippetParam("my-file-abc123")).toEqual({
      slug: "my-file",
      shortId: "abc123",
    });
  });

  it("parses a slug with multiple hyphens", () => {
    expect(parseSnippetParam("hello-world-foo-zz99aa")).toEqual({
      slug: "hello-world-foo",
      shortId: "zz99aa",
    });
  });

  it("returns null when param is too short (< 8 chars)", () => {
    expect(parseSnippetParam("a-b1c2")).toBeNull();
    expect(parseSnippetParam("")).toBeNull();
    expect(parseSnippetParam("ab1234")).toBeNull();
  });

  it("returns null when separator is not a hyphen", () => {
    expect(parseSnippetParam("my-file_abc123")).toBeNull();
  });

  it("returns null when shortId contains uppercase letters", () => {
    expect(parseSnippetParam("my-file-ABC123")).toBeNull();
  });

  it("returns null when shortId contains special characters", () => {
    expect(parseSnippetParam("my-file-ab!123")).toBeNull();
  });

  it("returns null when slug is empty (param is just the shortId with leading hyphen)", () => {
    // "-abc123" => slug would be "" after slicing off "-abc123"
    expect(parseSnippetParam("-abc123")).toBeNull();
  });

  it("returns null for exactly 7 chars (minimum with non-empty slug is 8)", () => {
    // "a-b1c2d" is 7 chars — too short
    expect(parseSnippetParam("a-b1c2d")).toBeNull();
  });

  it("accepts digits in shortId", () => {
    expect(parseSnippetParam("snippet-000000")).toEqual({
      slug: "snippet",
      shortId: "000000",
    });
  });
});

// ── codePointLength ──────────────────────────────────────────────────────────

describe("codePointLength", () => {
  it("matches String.length for plain ASCII", () => {
    expect(codePointLength("hello")).toBe(5);
  });

  it("counts a single emoji as one code point even though String.length is 2", () => {
    // The bug this guards against: passing String.length to the
    // snippets_code_char_count_check constraint failed when the snippet
    // contained any astral-plane character because Postgres char_length
    // counts code points, not UTF-16 code units.
    expect("🔥".length).toBe(2);
    expect(codePointLength("🔥")).toBe(1);
  });

  it("counts mixed ASCII + emoji correctly", () => {
    expect(codePointLength("a🔥b")).toBe(3);
  });

  it("returns 0 for empty string", () => {
    expect(codePointLength("")).toBe(0);
  });
});

// ── escapeHtml ───────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than and greater-than", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all special chars in one string", () => {
    expect(escapeHtml(`<a href="it's">&</a>`)).toBe(
      "&lt;a href=&quot;it&#39;s&quot;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

// ── generateShortId ──────────────────────────────────────────────────────────

describe("generateShortId", () => {
  it("returns a 6-character string", () => {
    expect(generateShortId()).toHaveLength(6);
  });

  it("only contains lowercase alphanumeric characters", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateShortId()).toMatch(/^[a-z0-9]{6}$/);
    }
  });

  it("produces unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, generateShortId));
    expect(ids.size).toBe(100);
  });
});

// ── toSlug ───────────────────────────────────────────────────────────────────

describe("toSlug", () => {
  it("lowercases and trims", () => {
    expect(toSlug("  Hello  ")).toBe("hello");
  });

  it("replaces spaces with hyphens", () => {
    expect(toSlug("my file name")).toBe("my-file-name");
  });

  it("collapses multiple non-alphanumeric chars into one hyphen", () => {
    expect(toSlug("foo!!bar")).toBe("foo-bar");
    expect(toSlug("foo   bar")).toBe("foo-bar");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("--hello--")).toBe("hello");
  });

  it("handles a filename with extension", () => {
    expect(toSlug("main.ts")).toBe("main-ts");
  });

  it("falls back to 'snippet' for empty or all-special-char input", () => {
    expect(toSlug("")).toBe("snippet");
    expect(toSlug("!!!")).toBe("snippet");
  });

  it("preserves numbers", () => {
    expect(toSlug("file123.js")).toBe("file123-js");
  });
});

// ── inferLanguage ────────────────────────────────────────────────────────────

describe("inferLanguage", () => {
  it("detects TypeScript by .ts extension", () => {
    expect(inferLanguage("foo.ts", "")).toBe("typescript");
  });

  it("extension takes priority over code heuristics", () => {
    expect(inferLanguage("main.rs", "interface Foo {}")).toBe("rust");
  });

  it("falls back to text for unrecognised input", () => {
    expect(inferLanguage("file", "just some plain text content")).toBe("text");
  });
});

// ── getRawFileExtension ──────────────────────────────────────────────────────

describe("getRawFileExtension", () => {
  it("returns the lowercase extension for normal filenames", () => {
    expect(getRawFileExtension("foo.TS")).toBe("ts");
  });

  it("falls back to txt when there is no extension", () => {
    expect(getRawFileExtension("Makefile")).toBe("txt");
  });

  it("ignores path separators in user input", () => {
    expect(getRawFileExtension("notes.md/evil")).toBe("txt");
  });

  it("falls back to txt for invalid extensions", () => {
    expect(getRawFileExtension("archive.tar.gz?download=1")).toBe("txt");
  });
});

// ── buildReactionRows ────────────────────────────────────────────────────────

describe("buildReactionRows", () => {
  it("maps each entry to a DB row with correct fields", () => {
    const rows = buildReactionRows("snip-1", "user-1", { 1: "🔥", 3: "💡" });
    expect(rows).toEqual([
      { snippet_id: "snip-1", author_id: "user-1", line_number: 1, emoji: "🔥" },
      { snippet_id: "snip-1", author_id: "user-1", line_number: 3, emoji: "💡" },
    ]);
  });

  it("converts string keys to numbers for line_number", () => {
    const rows = buildReactionRows("s", "u", { 5: "✨" });
    expect(rows[0].line_number).toBe(5);
    expect(typeof rows[0].line_number).toBe("number");
  });

  it("skips entries with empty emoji", () => {
    const rows = buildReactionRows("s", "u", { 1: "🔥", 2: "" });
    expect(rows).toHaveLength(1);
    expect(rows[0].line_number).toBe(1);
  });

  it("returns empty array when reactions is empty", () => {
    expect(buildReactionRows("s", "u", {})).toEqual([]);
  });

  it("skips invalid line numbers", () => {
    const rows = buildReactionRows("s", "u", { 0: "🔥", [-1]: "💡", 2: "✨" });
    expect(rows).toEqual([{ snippet_id: "s", author_id: "u", line_number: 2, emoji: "✨" }]);
  });
});

// ── buildCommentRows ─────────────────────────────────────────────────────────

describe("buildCommentRows", () => {
  it("maps each entry to a DB row with correct fields", () => {
    const rows = buildCommentRows("snip-1", "user-1", { 2: { body: "nice" } });
    expect(rows).toEqual([
      { snippet_id: "snip-1", author_id: "user-1", line_number: 2, body: "nice" },
    ]);
  });

  it("trims whitespace from body", () => {
    const rows = buildCommentRows("s", "u", { 1: { body: "  hello  " } });
    expect(rows[0].body).toBe("hello");
  });

  it("skips entries with blank body", () => {
    const rows = buildCommentRows("s", "u", { 1: { body: "  " }, 2: { body: "ok" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].line_number).toBe(2);
  });

  it("returns empty array when comments is empty", () => {
    expect(buildCommentRows("s", "u", {})).toEqual([]);
  });

  it("skips invalid line numbers", () => {
    const rows = buildCommentRows("s", "u", { 0: { body: "bad" }, 3: { body: "ok" } });
    expect(rows).toEqual([{ snippet_id: "s", author_id: "u", line_number: 3, body: "ok" }]);
  });
});

// ── firstReactionPerLine ─────────────────────────────────────────────────────

describe("firstReactionPerLine", () => {
  it("returns the first emoji seen for each line number", () => {
    const result = firstReactionPerLine([
      { line_number: 1, emoji: "🔥" },
      { line_number: 2, emoji: "💡" },
    ]);
    expect(result).toEqual({ 1: "🔥", 2: "💡" });
  });

  it("keeps the first reaction when multiple exist for the same line", () => {
    const result = firstReactionPerLine([
      { line_number: 1, emoji: "🔥" },
      { line_number: 1, emoji: "✨" },
      { line_number: 1, emoji: "💡" },
    ]);
    expect(result[1]).toBe("🔥");
  });

  it("returns an empty object for an empty input", () => {
    expect(firstReactionPerLine([])).toEqual({});
  });

  it("handles multiple lines independently", () => {
    const result = firstReactionPerLine([
      { line_number: 3, emoji: "🚀" },
      { line_number: 1, emoji: "🔥" },
      { line_number: 3, emoji: "💩" },
    ]);
    expect(result[1]).toBe("🔥");
    expect(result[3]).toBe("🚀");
  });
});

// ── languageDisplayName ──────────────────────────────────────────────────────

describe("languageDisplayName", () => {
  it("returns the friendly name for known ids", () => {
    expect(languageDisplayName("elixir")).toBe("Elixir");
  });

  it("returns mixed-case friendly names for ids that are all lowercase", () => {
    // "TypeScript" — proves we use the API's `name` field, not naive capitalize
    expect(languageDisplayName("typescript")).toBe("TypeScript");
  });

  it("falls back to the id when unknown", () => {
    expect(languageDisplayName("not-a-real-lang")).toBe("not-a-real-lang");
  });

  it("returns Text for an empty id", () => {
    expect(languageDisplayName("")).toBe("Text");
  });
});

// ── groupLineReactions ───────────────────────────────────────────────────────

describe("groupLineReactions", () => {
  const r = (emoji: string, authorId: string, authorUsername = authorId) => ({
    emoji,
    authorId,
    authorUsername,
    authorAvatarUrl: null,
  });

  it("groups reactions by emoji with counts and reactor lists", () => {
    const result = groupLineReactions(
      [r("🔥", "u1", "alice"), r("🔥", "u2", "bob"), r("💡", "u3", "carol")],
      null,
    );
    expect(result).toEqual([
      {
        emoji: "🔥",
        count: 2,
        mine: false,
        reactors: [
          { authorId: "u1", authorUsername: "alice", authorAvatarUrl: null },
          { authorId: "u2", authorUsername: "bob", authorAvatarUrl: null },
        ],
      },
      {
        emoji: "💡",
        count: 1,
        mine: false,
        reactors: [{ authorId: "u3", authorUsername: "carol", authorAvatarUrl: null }],
      },
    ]);
  });

  it("marks `mine` true when current user is one of the authors of an emoji", () => {
    const result = groupLineReactions([r("🔥", "u1"), r("🔥", "me"), r("💡", "u3")], "me");
    expect(result.find((g) => g.emoji === "🔥")?.mine).toBe(true);
    expect(result.find((g) => g.emoji === "💡")?.mine).toBe(false);
  });

  it("orders by count desc, then alphabetically by emoji", () => {
    const result = groupLineReactions(
      [r("💡", "u1"), r("🔥", "u2"), r("🔥", "u3"), r("✨", "u4")],
      null,
    );
    expect(result.map((g) => g.emoji)).toEqual(["🔥", "✨", "💡"]);
  });

  it("preserves reactor insertion order within a group", () => {
    const result = groupLineReactions(
      [r("🔥", "first"), r("🔥", "second"), r("🔥", "third")],
      null,
    );
    expect(result[0].reactors.map((x) => x.authorId)).toEqual(["first", "second", "third"]);
  });

  it("returns an empty array for no reactions", () => {
    expect(groupLineReactions([], null)).toEqual([]);
  });
});

// ── uniqueEmojisPerLine ──────────────────────────────────────────────────────

describe("uniqueEmojisPerLine", () => {
  it("groups emojis per line preserving insertion order", () => {
    expect(
      uniqueEmojisPerLine([
        { line_number: 1, emoji: "🔥" },
        { line_number: 1, emoji: "💡" },
        { line_number: 2, emoji: "👀" },
      ]),
    ).toEqual({
      1: ["🔥", "💡"],
      2: ["👀"],
    });
  });

  it("dedupes within a line so the same emoji from two reactors only renders once", () => {
    expect(
      uniqueEmojisPerLine([
        { line_number: 1, emoji: "🔥" },
        { line_number: 1, emoji: "🔥" },
        { line_number: 1, emoji: "💡" },
      ]),
    ).toEqual({ 1: ["🔥", "💡"] });
  });

  it("returns an empty object for an empty input", () => {
    expect(uniqueEmojisPerLine([])).toEqual({});
  });
});

// ── groupExportReactions ─────────────────────────────────────────────────────

describe("groupExportReactions", () => {
  it("groups by line then by unique emoji, accumulating reactors", () => {
    expect(
      groupExportReactions([
        { line_number: 1, emoji: "🔥", username: "alice" },
        { line_number: 1, emoji: "🔥", username: "bob" },
        { line_number: 1, emoji: "💡", username: "carol" },
        { line_number: 2, emoji: "👀", username: "dave" },
      ]),
    ).toEqual({
      1: [
        {
          emoji: "🔥",
          reactors: [
            { username: "alice", avatarUrl: null },
            { username: "bob", avatarUrl: null },
          ],
        },
        { emoji: "💡", reactors: [{ username: "carol", avatarUrl: null }] },
      ],
      2: [{ emoji: "👀", reactors: [{ username: "dave", avatarUrl: null }] }],
    });
  });

  it("propagates avatar URLs when present so the SVG export can render the real picture", () => {
    expect(
      groupExportReactions([
        {
          line_number: 1,
          emoji: "🔥",
          username: "alice",
          avatarUrl: "https://example.com/a.png",
        },
        { line_number: 1, emoji: "🔥", username: "bob", avatarUrl: null },
      ]),
    ).toEqual({
      1: [
        {
          emoji: "🔥",
          reactors: [
            { username: "alice", avatarUrl: "https://example.com/a.png" },
            { username: "bob", avatarUrl: null },
          ],
        },
      ],
    });
  });

  it("preserves emoji insertion order so the export matches the editor", () => {
    const result = groupExportReactions([
      { line_number: 1, emoji: "💡", username: "alice" },
      { line_number: 1, emoji: "🔥", username: "bob" },
    ]);
    expect(result[1].map((c) => c.emoji)).toEqual(["💡", "🔥"]);
  });

  it("returns an empty object for no input", () => {
    expect(groupExportReactions([])).toEqual({});
  });
});

// ── lineReactionsToExportChips ───────────────────────────────────────────────

describe("lineReactionsToExportChips", () => {
  it("converts the saved-view client state into the export chip shape", () => {
    // Regression: the export modal was showing the SSR-rendered server prop
    // and missing reactions added in the current session. Deriving from the
    // live `lineReactions` state via this helper keeps the export in sync.
    expect(
      lineReactionsToExportChips({
        1: [
          {
            emoji: "💚",
            authorUsername: "alice",
            authorAvatarUrl: "https://example.com/a.png",
          },
          { emoji: "💚", authorUsername: "bob", authorAvatarUrl: null },
          { emoji: "🔥", authorUsername: "carol", authorAvatarUrl: null },
        ],
        3: [{ emoji: "👀", authorUsername: "dave", authorAvatarUrl: null }],
      }),
    ).toEqual({
      1: [
        {
          emoji: "💚",
          reactors: [
            { username: "alice", avatarUrl: "https://example.com/a.png" },
            { username: "bob", avatarUrl: null },
          ],
        },
        { emoji: "🔥", reactors: [{ username: "carol", avatarUrl: null }] },
      ],
      3: [{ emoji: "👀", reactors: [{ username: "dave", avatarUrl: null }] }],
    });
  });

  it("returns an empty object for empty input", () => {
    expect(lineReactionsToExportChips({})).toEqual({});
  });

  it("preserves emoji insertion order per line", () => {
    const result = lineReactionsToExportChips({
      1: [
        { emoji: "🔥", authorUsername: "a", authorAvatarUrl: null },
        { emoji: "💡", authorUsername: "b", authorAvatarUrl: null },
      ],
    });
    expect(result[1].map((c) => c.emoji)).toEqual(["🔥", "💡"]);
  });
});

// ── buildSnippetSocialAlt ────────────────────────────────────────────────────

describe("buildSnippetSocialAlt", () => {
  it("renders the three-line filename / metadata / tagline format", () => {
    const alt = buildSnippetSocialAlt({
      filename: "foo.ts",
      authorUsername: "leandrocp",
      language: "typescript",
      theme: "everforest_light",
      lineCount: 83,
      charCount: 4424,
    });
    expect(alt).toBe(
      "foo.ts by @leandrocp\n" +
        "TypeScript | everforest_light | 83 lines | 4,424 / 8,000\n" +
        "# Supagist. Comment, react, share.",
    );
  });

  it("formats char count with grouping separators", () => {
    const alt = buildSnippetSocialAlt({
      filename: "foo.ts",
      authorUsername: "alice",
      language: "typescript",
      theme: "tokyo_night",
      lineCount: 1234,
      charCount: 7890,
    });
    expect(alt).toContain("7,890 / 8,000");
    expect(alt).toContain("1234 lines");
  });

  it("falls back to anonymous when author is missing", () => {
    const alt = buildSnippetSocialAlt({
      filename: "foo.ts",
      authorUsername: null,
      language: "typescript",
      theme: "tokyo_night",
      lineCount: 1,
      charCount: 1,
    });
    expect(alt).toContain("by anonymous");
  });

  it("uses Text when language is null", () => {
    const alt = buildSnippetSocialAlt({
      filename: "notes",
      authorUsername: "alice",
      language: null,
      theme: "github_light",
      lineCount: 1,
      charCount: 5,
    });
    expect(alt).toContain("Text | github_light");
  });

  it("never includes a trailing period after the username", () => {
    // Regression: the old format ended with `... by @alice.` which read as
    // a sentence stop right next to the username. The new format keeps
    // the username as a standalone token so it stays clickable in clients
    // that auto-link @handles.
    const alt = buildSnippetSocialAlt({
      filename: "foo.ts",
      authorUsername: "alice",
      language: "typescript",
      theme: "tokyo_night",
      lineCount: 1,
      charCount: 1,
    });
    expect(alt.split("\n")[0]).toBe("foo.ts by @alice");
  });

  it("ends with the project tagline on its own line", () => {
    const alt = buildSnippetSocialAlt({
      filename: "foo.ts",
      authorUsername: "alice",
      language: "typescript",
      theme: "tokyo_night",
      lineCount: 1,
      charCount: 1,
    });
    expect(alt.split("\n").at(-1)).toBe("# Supagist. Comment, react, share.");
  });
});

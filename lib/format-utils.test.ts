import { describe, it, expect } from "vitest";
import {
  formatAuthorNotification,
  formatCommentTimestamp,
  formatReactorList,
  formatTypingNames,
} from "./format-utils";

describe("formatAuthorNotification", () => {
  it("formats a comment notification", () => {
    expect(
      formatAuthorNotification({ kind: "comment", username: "bob", filename: "rose.tsx" }),
    ).toBe("@bob commented on rose.tsx");
  });

  it("formats a reaction notification with emoji", () => {
    expect(
      formatAuthorNotification({
        kind: "reaction",
        username: "bob",
        filename: "rose.tsx",
        emoji: "🔥",
      }),
    ).toBe("@bob reacted with 🔥 on rose.tsx");
  });

  it("falls back gracefully when the reaction emoji is missing", () => {
    expect(
      formatAuthorNotification({ kind: "reaction", username: "bob", filename: "rose.tsx" }),
    ).toBe("@bob reacted on rose.tsx");
  });
});

describe("formatTypingNames", () => {
  it("returns empty string for no names", () => {
    expect(formatTypingNames([])).toBe("");
  });

  it("uses singular 'is' for one name", () => {
    expect(formatTypingNames(["alice"])).toBe("@alice is");
  });

  it("uses plural 'are' and 'and' for two names", () => {
    expect(formatTypingNames(["alice", "bob"])).toBe("@alice and @bob are");
  });

  it("collapses to '@a, @b and 1 other are' for exactly three names", () => {
    expect(formatTypingNames(["a", "b", "c"])).toBe("@a, @b and 1 other are");
  });

  it("uses 'others' for four+ names", () => {
    expect(formatTypingNames(["a", "b", "c", "d"])).toBe("@a, @b and 2 others are");
    expect(formatTypingNames(["a", "b", "c", "d", "e"])).toBe("@a, @b and 3 others are");
  });
});

describe("formatReactorList", () => {
  it("returns 'no one' for an empty list", () => {
    expect(formatReactorList([])).toBe("no one");
  });

  it("formats a single name", () => {
    expect(formatReactorList(["alice"])).toBe("@alice");
  });

  it("formats two names with 'and'", () => {
    expect(formatReactorList(["alice", "bob"])).toBe("@alice and @bob");
  });

  it("formats three names with comma + 'and'", () => {
    expect(formatReactorList(["a", "b", "c"])).toBe("@a, @b and @c");
  });

  it("collapses to two names + 'and N others' for four+ names", () => {
    expect(formatReactorList(["a", "b", "c", "d"])).toBe("@a, @b and 2 others");
    expect(formatReactorList(["a", "b", "c", "d", "e"])).toBe("@a, @b and 3 others");
  });
});

describe("formatCommentTimestamp", () => {
  const now = new Date("2026-05-05T12:00:00Z");

  it("returns 'just now' for events under a minute old", () => {
    expect(formatCommentTimestamp("2026-05-05T11:59:30Z", now)).toBe("just now");
    expect(formatCommentTimestamp("2026-05-05T12:00:00Z", now)).toBe("just now");
  });

  it("returns 'just now' for slightly future timestamps (clock skew)", () => {
    expect(formatCommentTimestamp("2026-05-05T12:00:05Z", now)).toBe("just now");
  });

  it("returns minutes for events under an hour old", () => {
    expect(formatCommentTimestamp("2026-05-05T11:55:00Z", now)).toBe("5m ago");
    expect(formatCommentTimestamp("2026-05-05T11:01:00Z", now)).toBe("59m ago");
  });

  it("returns hours for events under a day old", () => {
    expect(formatCommentTimestamp("2026-05-05T10:00:00Z", now)).toBe("2h ago");
    expect(formatCommentTimestamp("2026-05-04T13:00:00Z", now)).toBe("23h ago");
  });

  it("returns days for events under a week old", () => {
    expect(formatCommentTimestamp("2026-05-04T12:00:00Z", now)).toBe("1d ago");
    expect(formatCommentTimestamp("2026-04-29T12:00:00Z", now)).toBe("6d ago");
  });

  it("falls back to a localized date for events older than a week", () => {
    const result = formatCommentTimestamp("2026-04-01T12:00:00Z", now);
    expect(result).not.toMatch(/ago|just now/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for an invalid date", () => {
    expect(formatCommentTimestamp("not-a-date", now)).toBe("");
  });
});

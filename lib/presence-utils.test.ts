import { describe, it, expect } from "vitest";
import { generateGuestName, nameToColor, nameToInitials } from "./presence-utils";

const WORDS_A = [
  "Agile",
  "Bold",
  "Calm",
  "Deft",
  "Epic",
  "Fast",
  "Glad",
  "Hale",
  "Iron",
  "Just",
  "Keen",
  "Lush",
  "Mild",
  "Neat",
  "Opal",
  "Pure",
  "Rare",
  "Sage",
  "True",
  "Wry",
];
const WORDS_B = [
  "Ant",
  "Bat",
  "Cat",
  "Elk",
  "Fox",
  "Gnu",
  "Hog",
  "Jay",
  "Koi",
  "Lynx",
  "Moth",
  "Newt",
  "Oryx",
  "Pika",
  "Rook",
  "Swan",
  "Toad",
  "Vole",
  "Wren",
  "Yak",
];
const AVATAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#4ade80",
  "#2dd4bf",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#c084fc",
  "#f472b6",
];

// ── generateGuestName ────────────────────────────────────────────────────────

describe("generateGuestName", () => {
  it("returns two words joined by a space", () => {
    const name = generateGuestName("550e8400-e29b-41d4-a716-446655440000");
    expect(name.split(" ")).toHaveLength(2);
  });

  it("is deterministic for the same key", () => {
    const key = "550e8400-e29b-41d4-a716-446655440000";
    expect(generateGuestName(key)).toBe(generateGuestName(key));
  });

  it("produces different names for different keys", () => {
    const a = generateGuestName("00000000-0000-0000-0000-000000000000");
    const b = generateGuestName("ffffffff-ffff-ffff-ffff-ffffffffffff");
    expect(a).not.toBe(b);
  });

  it("first word comes from WORDS_A", () => {
    const [a] = generateGuestName("550e8400-e29b-41d4-a716-446655440000").split(" ");
    expect(WORDS_A).toContain(a);
  });

  it("second word comes from WORDS_B", () => {
    const [, b] = generateGuestName("550e8400-e29b-41d4-a716-446655440000").split(" ");
    expect(WORDS_B).toContain(b);
  });

  it("handles UUIDs with dashes stripped", () => {
    expect(() => generateGuestName("aaaabbbbccccddddeeeeffff00001111")).not.toThrow();
  });
});

// ── nameToColor ──────────────────────────────────────────────────────────────

describe("nameToColor", () => {
  it("returns a hex color string", () => {
    expect(nameToColor("Agile Ant")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("is deterministic for the same name", () => {
    expect(nameToColor("Bold Cat")).toBe(nameToColor("Bold Cat"));
  });

  it("returns a color from the AVATAR_COLORS palette", () => {
    expect(AVATAR_COLORS).toContain(nameToColor("Calm Elk"));
  });

  it("differs for different names", () => {
    // Not guaranteed due to hashing, but these two specific names hash differently
    expect(nameToColor("Agile Ant")).not.toBe(nameToColor("Wry Yak"));
  });

  it("does not throw on empty string", () => {
    expect(() => nameToColor("")).not.toThrow();
    expect(AVATAR_COLORS).toContain(nameToColor(""));
  });
});

// ── nameToInitials ───────────────────────────────────────────────────────────

describe("nameToInitials", () => {
  it("returns initials for a two-word name", () => {
    expect(nameToInitials("Bold Cat")).toBe("BC");
  });

  it("returns single initial for a single word", () => {
    expect(nameToInitials("Agile")).toBe("A");
  });

  it("returns at most 2 characters for a three-word name", () => {
    expect(nameToInitials("Agile Bold Cat")).toBe("AB");
  });

  it("is uppercased", () => {
    expect(nameToInitials("bold cat")).toBe("BC");
  });

  it("handles empty string without throwing", () => {
    expect(() => nameToInitials("")).not.toThrow();
  });
});

import type { RenderInput } from "../render.ts";

export const shortCode = "export const greet = (name: string) => `Hello, ${name}!`;";
export const thirtyLines = Array.from(
  { length: 30 },
  (_, i) => `export const value${i + 1}: number = ${i + 1};`,
).join("\n");

// The three original M0 workloads, expressed with public render inputs only.
export function renderFixture(
  fixture: "plain" | "vercel" | "avatars",
  format: "svg",
  pixelRatio: 1 | 2,
): RenderInput {
  const base = { language: "typescript", theme: "github_dark", format, pixelRatio };
  if (fixture === "plain") return { ...base, code: shortCode };
  if (fixture === "vercel") return { ...base, code: shortCode, brand: "vercel" };
  const plusOne = (...names: string[]) => [
    { emoji: "+1", reactors: names.map((username) => ({ username })) },
  ];
  return {
    ...base,
    code: thirtyLines,
    brand: "vercel",
    author: "Ada",
    footer: { enabled: true },
    reactions: { 3: plusOne("Ada", "Grace"), 15: plusOne("Grace"), 30: plusOne("Ada") },
  };
}

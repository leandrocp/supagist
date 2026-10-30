import type { RenderInput } from "../render.ts";

export const shortCode = "export const greet = (name: string) => `Hello, ${name}!`;";
export const thirtyLines = Array.from(
  { length: 30 },
  (_, i) => `export const value${i + 1}: number = ${i + 1};`,
).join("\n");

export function renderFixture(
  fixture: "plain" | "vercel" | "avatars",
  format: "svg",
  pixelRatio: 1 | 2,
): RenderInput {
  return {
    code: fixture === "avatars" ? thirtyLines : shortCode,
    language: "typescript",
    theme: "github_dark",
    format,
    pixelRatio,
    fixture,
  };
}

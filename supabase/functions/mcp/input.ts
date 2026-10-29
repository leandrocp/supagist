import { z } from "zod";

// M0 only: the fixture switch exercises the real app's costly brand/avatar paths.
// This is not the planned public customization API.
export const renderInput = z.object({
  code: z
    .string()
    .max(16000)
    .transform((code) => code.replace(/\r\n?/g, "\n"))
    .refine(
      (code) => Array.from(code).length >= 1 && Array.from(code).length <= 8000,
      "code must contain 1–8000 Unicode code points",
    ),
  language: z.string().min(1).max(64).default("javascript"),
  theme: z.string().min(1).max(64).default("github_dark"),
  format: z.enum(["svg", "png"]).default("png"),
  pixelRatio: z.union([z.literal(1), z.literal(2)]).default(2),
  fixture: z.enum(["plain", "vercel", "avatars"]).default("plain"),
});

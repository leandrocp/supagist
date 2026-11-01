import { z } from "zod";
import catalog from "./spike/generated/theme-catalog.json" with { type: "json" };
import { BRAND_THEMES } from "./spike/generated/brand-themes.js";

export type ThemeEntry = {
  id: string;
  appearance: "dark" | "light";
  /** Upstream Neovim plugin (owner/repo) for Lumis themes, or the brand for brand themes. */
  family: string;
  kind: "lumis" | "brand";
};

export const themeCatalog: ThemeEntry[] = [
  ...(catalog as Omit<ThemeEntry, "kind">[]).map((theme) => ({ ...theme, kind: "lumis" as const })),
  ...BRAND_THEMES.map((theme) => ({
    id: theme.id,
    appearance: theme.appearance as "dark" | "light",
    family: theme.brand,
    kind: "brand" as const,
  })),
].sort((a, b) => a.id.localeCompare(b.id));

export const searchThemesInput = z.strictObject({
  query: z
    .string()
    .trim()
    .max(64)
    .optional()
    .describe(
      "Words to match against theme ids and families, for example 'catppuccin' or 'github dark'. Omit to list all.",
    ),
  appearance: z.enum(["dark", "light"]).optional().describe("Only dark or only light themes."),
  family: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .optional()
    .describe(
      "Theme family: the upstream plugin (for example nightfox, tokyonight, EdenEast/nightfox.nvim) or a brand (supabase, vercel).",
    ),
  limit: z.int().min(1).max(100).default(25),
  offset: z.int().min(0).default(0),
});

export type SearchThemesInput = z.input<typeof searchThemesInput>;

// Ids use _ or - between words; compare words, not raw characters.
const words = (text: string) => text.toLowerCase().replaceAll("-", " ").replaceAll("_", " ");

export function searchThemes(rawInput: SearchThemesInput) {
  const input = searchThemesInput.parse(rawInput);
  const terms = words(input.query ?? "")
    .split(" ")
    .filter(Boolean);
  const family = input.family?.toLowerCase();
  const matches = themeCatalog
    .filter((theme) => !input.appearance || theme.appearance === input.appearance)
    .filter((theme) => !family || theme.family.toLowerCase().includes(family))
    .filter((theme) => {
      const haystack = `${words(theme.id)} ${words(theme.family)}`;
      return terms.every((term) => haystack.includes(term));
    })
    // Exact id first, then ids that start with the query, then the rest.
    .map((theme) => {
      const id = words(theme.id);
      const query = terms.join(" ");
      const rank = !query ? 2 : id === query ? 0 : id.startsWith(query) ? 1 : 2;
      return { theme, rank };
    })
    .sort((a, b) => a.rank - b.rank || a.theme.id.localeCompare(b.theme.id))
    .map(({ theme }) => theme);
  const themes = matches.slice(input.offset, input.offset + input.limit);
  const next = input.offset + themes.length;
  return {
    themes,
    total: matches.length,
    offset: input.offset,
    nextOffset: next < matches.length ? next : null,
  };
}

function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = current;
  }
  return previous[b.length];
}

/** Up to `count` candidates closest to an unknown id, for error messages. */
export function closeMatches(value: string, candidates: string[], count = 5) {
  const target = words(value).replaceAll(" ", "");
  return candidates
    .map((candidate) => {
      const flat = words(candidate).replaceAll(" ", "");
      // A candidate containing the name ("dracula" in "dracula_soft") is a near match.
      const score =
        target.length >= 3 && flat.includes(target)
          ? Math.abs(flat.length - target.length) / 10
          : distance(target, flat);
      return { candidate, score };
    })
    .filter(({ score }) => score <= Math.max(2, Math.floor(target.length / 3)))
    .sort((a, b) => a.score - b.score || a.candidate.localeCompare(b.candidate))
    .slice(0, count)
    .map(({ candidate }) => candidate);
}
